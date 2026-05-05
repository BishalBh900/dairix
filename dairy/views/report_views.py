from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Avg
from django.http import JsonResponse
from datetime import date, timedelta, datetime

from ..models import Farmer, MilkCollection, Bill
from ..utils import get_role


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


@login_required(login_url='login')
def reports(request):
    role      = get_role(request.user)
    period    = request.GET.get('period', '')
    from_date = request.GET.get('from_date')
    to_date   = request.GET.get('to_date')
    sort_by   = request.GET.get('sort', 'filtered_milk')
    today     = date.today()

    if period == 'week':
        range_start, range_end = today - timedelta(days=7), today
        active_period_label = 'Last 7 Days'
    elif period == '15days':
        range_start, range_end = today - timedelta(days=15), today
        active_period_label = 'Last 15 Days'
    elif period == 'month':
        range_start, range_end = today.replace(day=1), today
        active_period_label = 'This Month'
    elif period == 'custom' and from_date and to_date:
        range_start = datetime.strptime(from_date, '%Y-%m-%d').date()
        range_end   = datetime.strptime(to_date,   '%Y-%m-%d').date()
        active_period_label = f'{from_date} → {to_date}'
    else:
        range_start = range_end = None
        active_period_label = ''

    if role == 'farmer':
        try:
            farmer_obj = request.user.farmer_profile
            milk_qs    = MilkCollection.objects.filter(farmer=farmer_obj)
        except Farmer.DoesNotExist:
            farmer_obj = None
            milk_qs = MilkCollection.objects.none()
    else:
        farmer_obj = None
        milk_qs = MilkCollection.objects.all()

    if range_start and range_end:
        milk_qs = milk_qs.filter(date__range=[range_start, range_end])
    elif from_date and to_date:
        milk_qs = milk_qs.filter(date__range=[from_date, to_date])

    if role == 'farmer':
        try:
            bill_qs = Bill.objects.filter(farmer=request.user.farmer_profile)
        except Farmer.DoesNotExist:
            bill_qs = Bill.objects.none()
    else:
        bill_qs = Bill.objects.all()

    if range_start and range_end:
        bill_qs_filtered = bill_qs.filter(inv_date__range=[range_start, range_end])
    elif from_date and to_date:
        bill_qs_filtered = bill_qs.filter(inv_date__range=[from_date, to_date])
    else:
        bill_qs_filtered = bill_qs

    total_milk    = milk_qs.aggregate(Sum('quantity'))['quantity__sum'] or 0
    total_farmers = 1 if role == 'farmer' else Farmer.objects.count()
    total_sales   = bill_qs_filtered.aggregate(Sum('total'))['total__sum'] or 0
    avg_fat       = milk_qs.aggregate(Avg('fat'))['fat__avg'] or 0

    report = []
    for i in range(7):
        day = today - timedelta(days=i)
        qs  = MilkCollection.objects.filter(date=day)
        if role == 'farmer':
            if farmer_obj:
                qs = qs.filter(farmer=farmer_obj)
            else:
                qs = MilkCollection.objects.none()
        report.append({
            'date':       day,
            'total_milk': qs.aggregate(Sum('quantity'))['quantity__sum'] or 0,
            'avg_fat':    round(qs.aggregate(Avg('fat'))['fat__avg'] or 0, 2),
            'avg_snf':    round(qs.aggregate(Avg('snf'))['snf__avg'] or 0, 2),
            'revenue':    qs.aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
        })

    top_farmers = []
    if role != 'farmer':
        for f in Farmer.objects.all():
            m   = MilkCollection.objects.filter(farmer=f).aggregate(Sum('quantity'))['quantity__sum'] or 0
            rev = MilkCollection.objects.filter(farmer=f).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            top_farmers.append({'name': f.name, 'total_milk': m, 'earnings': rev})
        top_farmers = sorted(top_farmers, key=lambda x: x['total_milk'], reverse=True)[:5]

    farmer_list = []
    farmer_list_total_milk    = 0
    farmer_list_total_revenue = 0

    if role != 'farmer':
        milk_base = MilkCollection.objects

        if range_start and range_end:
            milk_base = milk_base.filter(date__range=[range_start, range_end])
        elif from_date and to_date:
            milk_base = milk_base.filter(date__range=[from_date, to_date])

        for f in Farmer.objects.all().order_by('id'):
            m   = milk_base.filter(farmer=f).aggregate(Sum('quantity'))['quantity__sum'] or 0
            rev = milk_base.filter(farmer=f).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
            farmer_list.append({
                'id':               f.id,
                'name':             f.name,
                'gmail':            f.gmail,
                'phone':            f.phone,
                'filtered_milk':    float(m),
                'filtered_revenue': float(rev),
            })
            farmer_list_total_milk    += float(m)
            farmer_list_total_revenue += float(rev)

        valid_sort_keys = ['filtered_milk', 'filtered_revenue']
        sort_key = sort_by if sort_by in valid_sort_keys else 'filtered_milk'
        farmer_list = insertion_sort_farmers(farmer_list, key=sort_key, reverse=True)

    return render(request, 'dairy/reports.html', {
        'total_farmers':             total_farmers,
        'total_milk':                total_milk,
        'total_sales':               total_sales,
        'avg_fat':                   round(float(avg_fat), 2),
        'report':                    report,
        'top_farmers':               top_farmers,
        'farmer_list':               farmer_list,
        'farmer_list_total_milk':    farmer_list_total_milk,
        'farmer_list_total_revenue': farmer_list_total_revenue,
        'active_period_label':       active_period_label,
        'sort_by':                   sort_by,
        'role':                      role,
    })

# ── ADD THESE IMPORTS at the top of report_views.py if not already there ──
# from django.http import JsonResponse
# from datetime import date, timedelta, datetime
# from ..models import Farmer, MilkCollection


@login_required(login_url='login')
def farmer_history_api(request):
    farmer_id = request.GET.get('farmer_id')
    period    = request.GET.get('period', '7')   # '7', '15', '30', or 'custom'
    from_date = request.GET.get('from_date')
    to_date   = request.GET.get('to_date')
    today     = date.today()

    if not farmer_id:
        return JsonResponse({'error': 'farmer_id required'}, status=400)

    try:
        farmer = Farmer.objects.get(id=farmer_id)
    except Farmer.DoesNotExist:
        return JsonResponse({'error': 'Farmer not found'}, status=404)

    if period == 'custom' and from_date and to_date:
        start = datetime.strptime(from_date, '%Y-%m-%d').date()
        end   = datetime.strptime(to_date,   '%Y-%m-%d').date()
    else:
        days  = int(period) if period in ('7', '15', '30') else 7
        start = today - timedelta(days=days)
        end   = today

    qs = MilkCollection.objects.filter(
        farmer=farmer,
        date__range=[start, end]
    ).order_by('-date')

    records = []
    for entry in qs:
        records.append({
            'date':        entry.date.strftime('%d %b %Y'),
            'session':     getattr(entry, 'session', '—'),
            'milk_liters': float(entry.quantity),              # renamed
            'fat_percent': float(entry.fat),                   # renamed
            'snf_percent': float(entry.snf) if entry.snf else 0,  # renamed
            'amount':      float(entry.total_amount),          # renamed
        })

    total_milk    = sum(r['milk_liters'] for r in records)
    total_revenue = sum(r['amount']      for r in records)
    avg_fat       = round(sum(r['fat_percent'] for r in records) / len(records), 2) if records else 0
    avg_snf       = round(sum(r['snf_percent'] for r in records) / len(records), 2) if records else 0

    return JsonResponse({
        'total_milk':    round(total_milk, 1),    # flat — not nested in 'summary'
        'total_revenue': round(total_revenue, 0), # flat
        'avg_fat':       avg_fat,                 # flat
        'avg_snf':       avg_snf,                 # flat
        'records':       records,
    })