# Nosh collection retrieval research

> Historical research supporting current collection retrieval. Current behavior and limits are documented in `docs/ARCHITECTURE.md` and ADR 0001.

**Date:** 2026-08-21
**Question:** How should Nosh resolve references such as "the noodle recipe I saved" or "my cheesecake recipe" across a user's cookbooks, then answer from the right recipe?

## Recommendation

Treat the cookbook collection as Nosh's private retrieval corpus, but do not start by embedding every recipe. "RAG" describes the pattern of retrieving relevant data before the model answers. It does not require vectors.

The first version should use two read-only Nosh tools:

1. `search_recipe_collection(query, filters?, limit?)` returns at most five candidates with `pageId`, `cookbookId`, cookbook title, recipe title, category, tags, a short ingredient preview, and a relevance score.
2. `load_recipe(pageId)` returns the canonical `RecipeGraph` for one candidate.

Nosh searches when the user refers to a saved recipe that is not already the active recipe. If one result is clearly ahead, it loads that graph and answers. If two results are plausible, it asks a short disambiguation question using recipe and cookbook titles. Questions such as "what should I buy?" must use the loaded ingredient groups, quantities, and servings rather than model recall.

This gives the intended experience. The user can open Nosh from the shelf or at the supermarket and refer to any saved recipe naturally. Opening a recipe still supplies a strong active-context hint, but it is no longer the boundary of Nosh's knowledge.

## Why this is small in this codebase

Nosh already has the needed source data and tool loop:

- `cookbook_pages.recipe_graph` holds the canonical structured recipe. `types/recipeGraph.ts` already calls out search by ingredient, tag, cuisine, and dietary information as a RecipeGraph job.
- `createRecipePageWithGraph` also writes a flattened `recipes` row for compatibility, but `updatePageRecipeGraph` only updates `cookbook_pages.recipe_graph`. Collection retrieval should therefore treat the page graph as canonical or a later Nosh edit can leave the flattened row stale.
- `nosh-chat` currently receives only the active graph plus a list of up to 20 titles from the current cookbook. Its existing function-calling loop can accommodate the two read-only tools without putting every book into the prompt.
- The existing `cookbook_pages` RLS policy already checks ownership through `cookbooks.user_id = auth.uid()`.

One recipe should be one retrieval document. Do not chunk ingredients and steps into separate records. A personal recipe is already small, structured, and normally retrieved as a whole.

## Retrieval choices

| Method | Good at | Cost and failure mode | Fit for Nosh |
|---|---|---|---|
| Structured SQL | Explicit constraints such as cookbook, tag, ingredient, diet, time, category, and recency | Cannot resolve loose meaning by itself | Always use it for filters and deterministic facts |
| Weighted Postgres full-text search | Titles, cookbook names, descriptions, cuisine, tags, dietary tags, ingredients, notes, and source attribution | Exact vocabulary matters; synonyms and broad requests may miss | Best first retriever for "my cheesecake" and "the noodle recipe I saved" |
| Embeddings with pgvector | Meaning-based queries such as "the comforting creamy pasta" when those exact words are absent | Requires query and document embeddings, synchronization, retries, and a fixed embedding model | Add only after observed misses justify it |
| Hybrid FTS plus embeddings | Preserves exact title/ingredient matches while adding semantic recall | More moving parts and ranking to tune | Sensible second stage, not the first implementation |

Postgres supplies document vectors, user-query parsers, and ranking for full-text search. `websearch_to_tsquery` accepts raw user-style text and does not raise syntax errors, while `to_tsquery` expects search operators. Supabase documents stored generated `tsvector` columns, GIN indexes, weighted fields, and ranked RPC search functions. Titles should carry the highest weight, followed by cookbook title, tags and cuisine, then ingredients, description, notes, and steps. [PostgreSQL text-search controls](https://www.postgresql.org/docs/current/textsearch-controls.html) [Supabase full-text search](https://supabase.com/docs/guides/database/full-text-search) [PostgreSQL preferred text-search indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html)

For voice transcription errors, add title-only trigram similarity if the retrieval test set shows a real need. PostgreSQL's `pg_trgm` compares character trigrams and supports indexed similar-string search. This is cheaper than adding an embedding pipeline solely for misspelled recipe names. [PostgreSQL `pg_trgm`](https://www.postgresql.org/docs/current/pgtrgm.html)

## Minimal database shape

Add a denormalized search document beside each cookbook page, derived from `recipe_graph`, and keep it current in the database whenever the graph changes. A trigger is safer than relying on every client write path. The document should include:

- recipe title and optional aliases
- cookbook title or a separately weighted cookbook-title term
- description, cuisine, category, tags, and dietary tags
- ingredient names, notes, equipment, and source attribution
- step text at the lowest weight

Store a weighted `tsvector` and add a GIN index. Expose a `SECURITY INVOKER` RPC that joins the user's cookbooks, applies optional structured filters, matches `websearch_to_tsquery`, ranks results, and limits them. For a very small collection, computing the vector during the query is acceptable for the first migration; the stored vector and GIN index become worthwhile once measurement shows repeated scans. PostgreSQL says an index is not mandatory for full-text search, though GIN is the preferred type for regularly searched columns. [PostgreSQL preferred text-search indexes](https://www.postgresql.org/docs/current/textsearch-indexes.html)

The RPC should not accept a trusted `user_id` argument. It should run as the authenticated caller and let RLS or an explicit `auth.uid()` ownership predicate limit rows. Supabase recommends `SECURITY INVOKER` for database functions. It also notes that grants and RLS are separate controls, and that RLS does not protect function execution itself. Grant `EXECUTE` only to `authenticated`, revoke it from `anon`, and keep the caller's JWT on the database request. [Supabase database functions](https://supabase.com/docs/guides/database/functions) [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api) [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) [Supabase Edge Function auth](https://supabase.com/docs/guides/functions/auth)

## Agent behavior

The model should decide when to retrieve, not which rows it is allowed to see.

1. Prefer the active `RecipeGraph` when the user clearly says "this" or asks about the visible recipe.
2. Call collection search for a named or described saved recipe outside active context.
3. Pass useful structured hints when present, such as `cookbookId`, ingredient, category, or a recency phrase. The RPC owns ranking and access control.
4. Load the winning graph before answering ingredient, quantity, step, timing, substitution, scaling, or shopping-list questions.
5. Ask the user when candidates are close. Never silently choose between two similarly named cheesecakes.
6. Return only the needed graph and a few candidates to the model. A large model context window is not a reason to preload the collection on every turn.

A shopping-list tool can come later. Initially, the model can format a list from the loaded graph. The quantities remain grounded because the graph supplies them. If the user requests a different serving count, Nosh can apply the existing serving-scaling logic to a temporary graph before formatting the list.

## When to add embeddings

Keep a small retrieval evaluation set made from real user wording. Include exact titles, partial titles, ingredients, cookbook references, recency, voice-to-text errors, and conceptual requests. Add semantic retrieval only if weighted FTS plus structured filters fails queries that matter.

If that happens, add one embedding per recipe search document and combine semantic and lexical rankings with reciprocal rank fusion. Supabase's official hybrid example uses recipes to show the tradeoff: keyword search preserves exact "Italian" and "tomato sauce" matches, while semantic search can also find "Spaghetti Marinara." Supabase also warns that all compared embeddings must use the same model. [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) [Supabase semantic search](https://supabase.com/docs/guides/ai/semantic-search)

Do not add HNSW at personal-cookbook scale. pgvector performs exact nearest-neighbor search by default. Approximate indexes trade recall for speed, and tenant filters can reduce returned results because filtering occurs after an approximate index scan. Exact vector search over one authenticated user's modest collection is simpler and gives perfect recall. Revisit indexing only at measured scale. [pgvector official repository](https://github.com/pgvector/pgvector)

Embedding generation is the expensive part of the design, not vector comparison. Supabase's automatic-embeddings guide requires asynchronous generation, update synchronization, failure handling, retries, queues, cron, and an Edge Function, while full-text vectors can stay current inside Postgres. That is why embeddings belong behind evidence, not in the first slice. [Supabase automatic embeddings](https://supabase.com/docs/guides/ai/automatic-embeddings)

## Implementation slice

1. Add the searchable document, weighted FTS, ownership-scoped RPC, and tests proving one user cannot retrieve another user's pages.
2. Add `search_recipe_collection` and `load_recipe` to `nosh-chat` and the client toolkit as read-only tools.
3. Stop injecting a capped current-book title list as the model's only collection awareness. Keep active cookbook and page identifiers as ranking hints.
4. Test the two core journeys: "I want to make the noodle recipe I saved" and "Give me the ingredients for my cheesecake recipe." Test ambiguity with two cheesecakes.
5. Measure misses. Add trigram title matching, then hybrid embeddings, only in response to observed failures.

The result is a collection-aware Nosh with a narrow implementation: database retrieval, two tools, and explicit ambiguity handling. It keeps the model smart by giving it the right recipe at the right time rather than by stuffing every book into every prompt.
