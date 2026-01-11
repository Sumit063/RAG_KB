from django.db import migrations
from pgvector.django import VectorField


def create_vector_extension(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return
    schema_editor.execute('CREATE EXTENSION IF NOT EXISTS vector')


class Migration(migrations.Migration):
    dependencies = [
        ('kb', '0002_document_storage_fields'),
    ]

    operations = [
        migrations.RunPython(create_vector_extension, migrations.RunPython.noop),
        migrations.AddField(
            model_name='chunk',
            name='embedding',
            field=VectorField(blank=True, dimensions=1536, null=True),
        ),
    ]
