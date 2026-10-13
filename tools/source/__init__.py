"""Byte-preserving source assembly, separate from browser execution modules."""
from .tree import read_source, source_hash, find_record

__all__ = ['read_source', 'source_hash', 'find_record']
