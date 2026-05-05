from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Sum, Q
from datetime import date
import json

from ..models import Purchase, PurchaseItem
from ..decorators import admin_or_staff_required, admin_only


@login_required(login_url='login')
@admin_or_staff_required
def purchases(request):
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            data        = json.loads(request.body)
            inv_no      = data.get('inv_no', '').strip()
            inv_date    = data.get('inv_date')
            vendor      = data.get('vendor', '').strip()
            particulars = data.get('particulars', '').strip()
            amount      = float(data.get('amount', 0))
            notes       = data.get('notes', '').strip()
            items       = data.get('items', [])

            if not all([inv_no, inv_date, vendor]):
                return JsonResponse({'success': False, 'error': 'Missing required fields.'})

            purchase = Purchase.objects.create(
                inv_no      = inv_no,
                inv_date    = inv_date,
                vendor      = vendor,
                particulars = particulars,
                amount      = amount,
                notes       = notes,
                created_by  = request.user,
            )

            for item in items:
                PurchaseItem.objects.create(
                    purchase    = purchase,
                    description = item.get('description', ''),
                    quantity    = float(item.get('quantity', 1)),
                    unit        = item.get('unit', ''),
                    rate        = float(item.get('rate', 0)),
                    amount      = float(item.get('amount', 0)),
                )

            return JsonResponse({'success': True, 'id': purchase.id})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    qs        = Purchase.objects.all().order_by('-inv_date', '-id')
    search    = request.GET.get('q', '').strip()
    from_date = request.GET.get('from_date', '')
    to_date   = request.GET.get('to_date', '')

    if search:
        qs = qs.filter(
            Q(vendor__icontains=search) |
            Q(inv_no__icontains=search) |
            Q(particulars__icontains=search)
        )
    if from_date:
        qs = qs.filter(inv_date__gte=from_date)
    if to_date:
        qs = qs.filter(inv_date__lte=to_date)

    today         = date.today()
    today_total   = Purchase.objects.filter(inv_date=today).aggregate(t=Sum('amount'))['t'] or 0
    month_total   = Purchase.objects.filter(
                        inv_date__year=today.year,
                        inv_date__month=today.month
                    ).aggregate(t=Sum('amount'))['t'] or 0
    overall_total = Purchase.objects.aggregate(t=Sum('amount'))['t'] or 0
    total_amount  = qs.aggregate(t=Sum('amount'))['t'] or 0

    return render(request, 'dairy/purchases.html', {
        'purchases'    : qs,
        'search'       : search,
        'from_date'    : from_date,
        'to_date'      : to_date,
        'today_total'  : today_total,
        'month_total'  : month_total,
        'overall_total': overall_total,
        'total_amount' : total_amount,
    })


@login_required(login_url='login')
@admin_only
def delete_purchase(request, pk):
    if request.method == 'POST':
        purchase = get_object_or_404(Purchase, pk=pk)
        purchase.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})
@login_required(login_url='login')
@admin_or_staff_required
def purchase_detail_api(request, pk):
    purchase = get_object_or_404(Purchase, pk=pk)
    items = purchase.items.all()
    return JsonResponse({
        'inv_no':      purchase.inv_no,
        'inv_date':    purchase.inv_date.strftime('%d %b %Y'),
        'vendor':      purchase.vendor,
        'particulars': purchase.particulars,
        'notes':       purchase.notes or '',
        'amount':      float(purchase.amount),
        'items': [
            {
                'description': i.description,
                'quantity':    float(i.quantity),
                'unit':        i.unit,
                'rate':        float(i.rate),
                'amount':      float(i.amount),
            }
            for i in items
        ],
    })