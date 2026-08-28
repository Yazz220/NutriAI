# Nosh content-rights position

_Reviewed 2026-08-26. This is a launch compliance memo, not legal advice._

## Decision

Set App Store Connect **Content Rights** to **Yes, this app uses third-party content**. The API value is `USES_THIRD_PARTY_CONTENT`, not `DOES_NOT_USE_THIRD_PARTY_CONTENT`. Nosh accepts third-party recipe URLs and currently recognizes YouTube, TikTok, and Instagram links, so the "does not use" answer would be inaccurate. Apple defines the field to cover apps that "contain, show, or access" third-party content, and its API exposes those two declaration values. [App Store Connect field definition](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information), [App Store Connect API values](https://developer.apple.com/documentation/appstoreconnectapi/app/attributes-data.dictionary)

Do not submit that declaration as an assertion that the current social-video importer is cleared. Apple requires permission under each service's terms and may ask for authorization. It also bars saving, converting, or downloading third-party audio or video without the source's explicit authorization. [App Review Guidelines 5.2.1-5.2.3](https://developer.apple.com/app-store/review/guidelines/)

The declaration is supportable for version 1.0 only under these assumptions:

- Nosh disables server-side extraction of YouTube, TikTok, and Instagram video links until Nosh has written platform authorization or an approved API use that covers this exact workflow.
- The ordinary URL importer reads only public recipe pages where access is allowed by the publisher's terms or applicable law. It keeps the source link and normalized recipe facts, not the page HTML, source photos, thumbnails, audio, video, distinctive prose, or visual design.
- A photo or video upload is accepted only after the user confirms that they created it or have permission to use it. Nosh's terms grant only the license needed for private processing, storage, generation, and deletion.
- Generated cookbook pages stay private to the account. They use new artwork and independently worded functional directions. Nosh does not publish, syndicate, sell, or redistribute imported material.

If build 13 still sends social-video URLs for extraction, the truthful Content Rights answer remains **Yes**, but Nosh cannot presently substantiate the necessary platform permission. Disable that path before App Review or obtain authorization.

## Why the private recipe-page model can work

Under U.S. Copyright Office guidance, a bare ingredient list and a simple procedure are not copyrightable. Creative explanations, photographs, illustrations, and expressive recipe text may be protected. This supports extracting factual recipe data and writing a new functional presentation. It does not support copying a creator's headnote, storytelling, images, video frames, or distinctive instructions. Other countries may protect the same material differently, which is why Apple requires rights or a legal permission in every storefront. [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf), [Apple's Content Rights definition](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)

Private storage reduces redistribution risk, but it does not cure unauthorized access or copying. A user warranty also does not override a platform's contract with Nosh. The importer itself must comply with the source's terms.

## Platform findings

### YouTube

YouTube permits viewing through its service and official embeddable player. Its terms prohibit accessing, reproducing, downloading, altering, or otherwise using content except where the service permits it, YouTube and the relevant rights holder give prior written permission, or applicable law permits it. Its API developer policies separately prohibit downloading, importing, backing up, caching, or storing copies of YouTube audiovisual content without prior written approval. An end user pasting a link does not supply that approval. [YouTube Terms of Service](https://www.youtube.com/t/terms), [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies), [official embedding guidance](https://support.google.com/youtube/answer/171780)

Launch rule: Nosh may retain the URL and offer "Visit original source." It must not fetch the video, audio, captions, transcript, thumbnail, or frames for extraction. An official embed is a separate future feature and must retain YouTube attribution, controls, and policy compliance.

### TikTok

TikTok's general terms restrict TikTok content to personal, non-commercial use through the service and prohibit downloading, copying, reproducing, displaying, or exploiting it without the applicable prior written consent. TikTok's Developer Terms allow automated collection and use only as described in its developer documentation. The Display API requires a registered app, product approval, user authorization, and scopes, and is designed to display an authorized user's profile and videos. It does not grant a general right to extract arbitrary public video URLs. [TikTok Terms of Service](https://www.tiktok.com/legal/page/us/terms-of-service/en), [TikTok Developer Terms](https://www.tiktok.com/legal/page/global/tik-tok-developer-terms-of-service/en), [Display API overview](https://developers.tiktok.com/docs/en/display-api-overview), [Display API prerequisites](https://developers.tiktok.com/docs/en/display-api-get-started)

Launch rule: treat TikTok links like bookmarks only. Do not retrieve or process video, audio, captions, thumbnails, or frames without an approved TikTok integration and any rights the creator must separately grant.

### Instagram

Instagram prohibits automated access or collection without express permission and says users cannot violate others' intellectual-property rights. Meta's Instagram Platform policy makes the developer responsible for owners' restrictions and says the platform cannot be used simply to import or back up user content without prior permission. [Instagram Terms of Use](https://help.instagram.com/581066165581870), [Meta Platform Terms and Developer Policies](https://developers.facebook.com/terms)

Launch rule: retain and open an Instagram URL, but do not scrape or process the post, Reel, caption, image, audio, thumbnail, or video. If Nosh later adds an approved Instagram API integration, limit it to the approved use, user authorization, and owner restrictions.

### User-supplied photos and videos

The user owns a photo or video they created, but possession of a file does not prove ownership. The upload flow and Terms of Use should require the user to confirm that they own the material or have all necessary permissions, including any music, people, logos, and third-party artwork in it. Keep the original private, use it only to produce the requested recipe, do not train on it unless separately disclosed and consented to, and delete it with the recipe or account under Nosh's published retention rules.

## Behaviors to prohibit

- Downloading, transcoding, caching, proxying, or extracting frames, audio, captions, or transcripts from YouTube, TikTok, Instagram, or another third-party media host without explicit authorization.
- Circumventing login, paywall, geographic, DRM, rate, robots, or other access controls.
- Copying source photos, thumbnails, logos, creator likenesses, page designs, headnotes, stories, reviews, or distinctive prose into the generated page.
- Presenting generated art that imitates a named creator's protected page, brand, or identifiable source image.
- Removing attribution or implying that Nosh created the source recipe. Keep a neutral source link where one exists.
- Publishing or sharing imported source material to other users. Reassess rights before adding community feeds, public cookbook links, discovery, or collaborative libraries.
- Treating the user's checkbox as permission from YouTube, TikTok, Instagram, a publisher, or the underlying rights holder.

## App Review note

Use this explanation after the social-video extraction path is disabled:

> Nosh lets a signed-in user create a private personal cookbook from text or images they provide and from permitted public recipe webpages. For webpage imports, Nosh stores the source URL and normalized factual recipe data, then creates new artwork and independently worded functional directions. It does not reproduce or redistribute source photos, video, audio, page design, or expressive editorial text. YouTube, TikTok, and Instagram links are not downloaded or processed; users can only open the original URL in the source service. Uploaded content and generated pages remain private to the user's account, and users must confirm they own uploaded material or have permission to use it.

## Recheck triggers

Re-run this review before enabling social-media extraction, official embeds, public sharing, collaborative books, creator attribution beyond a source link, training on uploads, or importing from a publisher whose terms restrict automated access. Platform terms can change, so verify the cited first-party pages again for every release that changes import behavior.
