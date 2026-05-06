from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.conf import settings
from .models import UserProfile, Farmer

@receiver(post_save, sender=User)
def create_user_profile_and_link_farmer(sender, instance, created, **kwargs):
    if created:
        email = instance.email or ''
        admin_emails = getattr(settings, 'ADMIN_EMAILS', [])
        staff_emails = getattr(settings, 'STAFF_EMAILS', [])

        # Determine role from email
        if instance.is_superuser:
            role = 'admin'
        elif email in admin_emails:
            role = 'admin'
        elif email in staff_emails:
            role = 'staff'
        else:
            role = 'farmer'

        # Create profile with correct role
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        if not profile.role:
            profile.role = role
            profile.save()

        # Link to existing Farmer record if email matches
        if role == 'farmer':
            farmer = Farmer.objects.filter(gmail__iexact=email).first()
            if farmer and farmer.user is None:
                farmer.user = instance
                farmer.save()