"""Auto-captions module — server-side Whisper transcription.

Isolation contract: NOTHING in this package may break the video routes.
app.py imports it inside a try/except, this __init__ stays import-light
(heavy deps load lazily in engine._load()), and routes own their own job
store — a captions bug can only ever fail captions requests.
"""
