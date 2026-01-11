from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('kb', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='document',
            name='file',
            field=models.FileField(blank=True, null=True, upload_to='docs/'),
        ),
        migrations.AddField(
            model_name='document',
            name='original_filename',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='document',
            name='raw_text',
            field=models.TextField(blank=True, null=True),
        ),
    ]
