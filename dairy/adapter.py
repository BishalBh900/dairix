from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings
from .models import Farmer, UserProfile


class DairixAccountAdapter(DefaultAccountAdapter):
    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        if commit:
            user.save()
        return user


class DairixSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form)

        email = user.email or ''
        admin_emails = getattr(settings, 'ADMIN_EMAILS', [])
        staff_emails = getattr(settings, 'STAFF_EMAILS', [])

        if email in admin_emails:
            role = 'admin'
        elif email in staff_emails:
            role = 'staff'
        else:
            role = 'farmer'

        profile, created = UserProfile.objects.get_or_create(user=user)
        if created or not profile.role:
            profile.role = role
            profile.save()

        if role == 'farmer':
            Farmer.objects.get_or_create(
                user=user,
                defaults={
                    'name':    user.get_full_name() or user.username,
                    'phone':   '0000000000',
                    'address': '',
                    'gmail':   email,
                }
            )

        return user