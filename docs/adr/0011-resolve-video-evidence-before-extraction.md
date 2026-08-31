# Resolve video evidence before extraction

Nosh no longer sends an arbitrary social page URL to a multimodal model and hopes that the provider can retrieve it. The original adapter accepted canonical public YouTube links or directly retrievable MP4, MOV, MPEG, and WebM files, bounded direct downloads at 20 MB, recorded whether a separate transcript existed, and returned stable unsupported, unavailable, or oversized decisions before Recipe Graph extraction.

ADR 0015 narrows the launch contract after the content-rights and platform-API review: social-platform links are bookmarks only, and video model extraction is limited to permissioned private uploads or permission-confirmed direct files.
