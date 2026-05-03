from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):

    ROLE_CHOICES = [
        ('admin',  'Admin'),
        ('staff',  'Staff'),
        ('farmer', 'Farmer'),
    ]

    user  = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role  = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')
    photo = models.TextField(blank=True, null=True)  # base64 photo for admin/staff

    def is_admin(self):        return self.role == 'admin'
    def is_staff_member(self): return self.role == 'staff'
    def is_farmer(self):       return self.role == 'farmer'
    def can_input(self):       return self.role in ['admin', 'staff']

    def __str__(self):
        return f"{self.user.username} ({self.role})"
