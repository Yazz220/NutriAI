# Resolve video evidence before extraction

Nosh no longer sends an arbitrary social page URL to a multimodal model and hopes that the provider can retrieve it. The video adapter accepts canonical public YouTube links or directly retrievable MP4, MOV, MPEG, and WebM files, bounds direct downloads at 20 MB, records whether a separate transcript exists, and returns stable unsupported, unavailable, or oversized decisions before Recipe Graph extraction; a replaceable `VIDEO_MODEL` may change the reader without creating another capture pipeline.
