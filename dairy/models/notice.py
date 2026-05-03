from django.db import models
from django.contrib.auth.models import User


class Notice(models.Model):
    TARGET_CHOICES = [('all', 'All'), ('farmer', 'Farmers'), ('staff', 'Staff')]

    title      = models.CharField(max_length=150)
    message    = models.TextField(blank=True)
    image      = models.ImageField(upload_to='notices/', blank=True, null=True)
    target     = models.CharField(max_length=10, choices=TARGET_CHOICES, default='all')
    is_active  = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='notices')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class NoticeRead(models.Model):
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notice_reads')
    notice  = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='reads')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'notice')

    def __str__(self):
        return f"{self.user.username} read '{self.notice.title}'"
