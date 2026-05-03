
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, Farmer

@receiver(post_save, sender=User)
def create_user_profile_and_link_farmer(sender, instance, created, **kwargs):
    if created:
        # Create the UserProfile with default (should be 'farmer')
        profile = UserProfile.objects.create(user=instance)
        # Try to link this User to a Farmer using Gmail
        farmer = Farmer.objects.filter(gmail__iexact=instance.email).first()
        if farmer:
            profile.role = 'farmer'
            profile.save()
            farmer.user = instance
            farmer.save()