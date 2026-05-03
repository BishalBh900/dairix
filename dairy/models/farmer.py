from django.db import models
from django.contrib.auth.models import User


class Farmer(models.Model):
    user    = models.OneToOneField(User, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='farmer_profile')
    name    = models.CharField(max_length=100)
    phone   = models.CharField(max_length=15, null=False, blank=False)
    address = models.CharField(max_length=255)
    gmail   = models.EmailField(default="test@example.com")
    photo   = models.TextField(blank=True, null=True)  # base64 photo for farmers

    def __str__(self):
        return self.name
