from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json

from ..models import Farmer
from ..decorators import admin_or_staff_required, admin_only
from ..utils import get_role


@login_required(login_url='login')
@admin_or_staff_required
def farmers(request):
    return render(request, 'dairy/farmers.html', {'farmers': Farmer.objects.all()})


@login_required(login_url='login')
@admin_or_staff_required
def add_farmer(request):
    if request.method == 'POST':
        Farmer.objects.create(
            name    = request.POST.get('name'),
            phone   = request.POST.get('phone'),
            address = request.POST.get('address'),
            gmail   = request.POST.get('gmail'),
        )
        return redirect('farmers')
    return render(request, 'dairy/add_farmer.html')


@login_required(login_url='login')
@admin_only
def delete_farmer(request, id):
    get_object_or_404(Farmer, id=id).delete()
    return redirect('farmers')


@login_required(login_url='login')
@require_POST
def upload_farmer_photo(request, farmer_id):
    try:
        data         = json.loads(request.body)
        photo_base64 = data.get('photo', '').strip()

        if not photo_base64:
            return JsonResponse({'success': False, 'error': 'No photo provided.'}, status=400)
        if not photo_base64.startswith('data:image/'):
            return JsonResponse({'success': False, 'error': 'Invalid image format.'}, status=400)

        role = get_role(request.user)

        if role in ('admin', 'staff'):
            profile       = request.user.profile
            profile.photo = photo_base64
            profile.save()
        elif role == 'farmer':
            try:
                farmer = request.user.farmer_profile
                if farmer.id != farmer_id:
                    return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)
                farmer.photo = photo_base64
                farmer.save()
            except Farmer.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Farmer profile not found.'}, status=404)
        else:
            return JsonResponse({'success': False, 'error': 'Permission denied.'}, status=403)

        return JsonResponse({'success': True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
