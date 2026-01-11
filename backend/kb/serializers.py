from rest_framework import serializers

from .models import Document, IndexJob


class DocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = (
            'id',
            'title',
            'file',
            'file_url',
            'created_at',
            'status',
            'chunks_count',
            'last_indexed_at',
            'error_message',
        )

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class DocumentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ('title', 'file')


class IndexJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndexJob
        fields = (
            'id',
            'document',
            'status',
            'started_at',
            'finished_at',
            'error_message',
            'celery_task_id',
        )
