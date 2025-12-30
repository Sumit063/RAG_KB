from django.contrib import admin

from .models import Chunk, Document, IndexJob


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status', 'chunks_count', 'created_at')
    search_fields = ('title',)
    list_filter = ('status',)


@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ('id', 'document', 'chunk_index', 'vector_id', 'created_at')
    search_fields = ('vector_id', 'document__title')


@admin.register(IndexJob)
class IndexJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'document', 'status', 'started_at', 'finished_at')
    list_filter = ('status',)
