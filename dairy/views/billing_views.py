from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from datetime import date
import json

from ..models import Farmer, Bill, BillItem
from ..utils import get_role


@login_required(login_url='login')
def billing(request):
    role = get_role(request.user)

    if role == 'farmer':
        try:
            farmer_obj = request.user.farmer_profile
            bills      = Bill.objects.filter(farmer=farmer_obj).prefetch_related('items')
        except Farmer.DoesNotExist:
            bills = Bill.objects.none()
        return render(request, "dairy/billing.html", {"role": role, "bills": bills})

    return render(request, "dairy/billing.html", {
        "role":         role,
        "farmers_list": Farmer.objects.all(),
    })


@login_required(login_url='login')
@require_POST
def save_bill(request):
    if get_role(request.user) not in ('admin', 'staff'):
        return JsonResponse({"error": "Permission denied"}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    farmer    = None
    farmer_id = data.get('farmer_id')
    if farmer_id:
        try:
            farmer = Farmer.objects.get(id=farmer_id)
        except Farmer.DoesNotExist:
            pass

    last_bill = Bill.objects.order_by('-id').first()
    if last_bill and last_bill.inv_no.startswith('INV-'):
        try:
            last_num = int(last_bill.inv_no.split('-')[1])
        except (ValueError, IndexError):
            last_num = 0
    else:
        last_num = 0
    inv_no = f'INV-{str(last_num + 1).zfill(4)}'

    bill = Bill.objects.create(
        farmer     = farmer,
        inv_no     = inv_no,
        inv_date   = data.get('inv_date') or date.today().isoformat(),
        cust_name  = data.get('cust_name', ''),
        cust_addr  = data.get('cust_addr', ''),
        cust_phone = data.get('cust_phone', ''),
        total      = data.get('total', 0),
        created_by = request.user,
    )

    for item in data.get('items', []):
        BillItem.objects.create(
            bill = bill,
            desc = item.get('desc', ''),
            qty  = item.get('qty', 0),
            rate = item.get('rate', 0),
        )

    return JsonResponse({"success": True, "bill_id": bill.id, "inv_no": inv_no})


@login_required(login_url='login')
def get_bills(request):
    if get_role(request.user) not in ('admin', 'staff'):
        return JsonResponse({"error": "Permission denied"}, status=403)

    bills = Bill.objects.prefetch_related('items').order_by('-saved_at')[:100]
    return JsonResponse({"bills": [{
        "id":         b.id,
        "inv_no":     b.inv_no,
        "inv_date":   str(b.inv_date),
        "cust_name":  b.cust_name,
        "cust_addr":  b.cust_addr,
        "cust_phone": b.cust_phone,
        "farmer_id":  b.farmer_id,
        "total":      b.total,
        "saved_at":   b.saved_at.isoformat(),
        "items": [
            {"desc": i.desc, "qty": i.qty, "rate": i.rate, "amount": i.amount}
            for i in b.items.all()
        ],
    } for b in bills]})


@login_required(login_url='login')
def delete_bill_view(request, bill_id):
    if get_role(request.user) != 'admin':
        return JsonResponse({"error": "Permission denied"}, status=403)
    get_object_or_404(Bill, id=bill_id).delete()
    return JsonResponse({"success": True})
