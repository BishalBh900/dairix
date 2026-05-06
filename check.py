import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dairy_management.settings')
django.setup()

from django.contrib.auth.models import User
from dairy.models import UserProfile, Farmer

for u in User.objects.all():
    try:
        role = u.profile.role
    except:
        role = 'NO PROFILE'
    farmer = Farmer.objects.filter(user=u).first()
    print(u.username, u.email, role, 'farmer_linked:', farmer is not None)
