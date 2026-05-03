from .models import UserProfile


# ─────────────────────────────────────────────
# 🔧 SAFE ROLE HELPER
# ─────────────────────────────────────────────
def get_role(user):
    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        role = 'admin' if user.is_superuser else 'staff'
        UserProfile.objects.create(user=user, role=role)
        return role


# ─────────────────────────────────────────────
# 🔃 INSERTION SORT ALGORITHM
# ─────────────────────────────────────────────
def insertion_sort_farmers(farmer_list, key='filtered_milk', reverse=True):
    for i in range(1, len(farmer_list)):
        current = farmer_list[i]
        j = i - 1
        while j >= 0 and (
            farmer_list[j][key] < current[key] if reverse
            else farmer_list[j][key] > current[key]
        ):
            farmer_list[j + 1] = farmer_list[j]
            j -= 1
        farmer_list[j + 1] = current
    return farmer_list