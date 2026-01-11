from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('file', models.FileField(upload_to='docs/')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'status',
                    models.CharField(
                        choices=[('UPLOADED', 'Uploaded'), ('INDEXING', 'Indexing'), ('INDEXED', 'Indexed'), ('FAILED', 'Failed')],
                        default='UPLOADED',
                        max_length=20,
                    ),
                ),
                ('chunks_count', models.IntegerField(default=0)),
                ('last_indexed_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Chunk',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('chunk_index', models.IntegerField()),
                ('text', models.TextField()),
                ('vector_id', models.CharField(max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                (
                    'document',
                    models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='chunks', to='kb.document'),
                ),
            ],
            options={
                'unique_together': {('document', 'chunk_index')},
            },
        ),
        migrations.CreateModel(
            name='IndexJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                (
                    'status',
                    models.CharField(
                        choices=[('PENDING', 'Pending'), ('RUNNING', 'Running'), ('DONE', 'Done'), ('FAILED', 'Failed')],
                        default='PENDING',
                        max_length=20,
                    ),
                ),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('finished_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('celery_task_id', models.CharField(blank=True, max_length=255, null=True)),
                ('document', models.ForeignKey(on_delete=models.deletion.CASCADE, to='kb.document')),
            ],
        ),
    ]
