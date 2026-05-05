from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.db.models import Sum, F
from datetime import date, timedelta
import json
from dateutil.relativedelta import relativedelta
from ..models import Farmer, Bill, BillItem
from ..decorators import admin_or_staff_required


@login_required(login_url='login')
@admin_or_staff_required
def sales(request):
    today       = date.today()
    month_start = today.replace(day=1)

    bill_qs = Bill.objects.all()

    today_sales = bill_qs.filter(inv_date=today).aggregate(Sum('total'))['total__sum'] or 0
    month_sales = bill_qs.filter(inv_date__gte=month_start).aggregate(Sum('total'))['total__sum'] or 0
    total_sales = bill_qs.aggregate(Sum('total'))['total__sum'] or 0

    daily_labels, daily_data = [], []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        amt = bill_qs.filter(inv_date=day).aggregate(Sum('total'))['total__sum'] or 0
        daily_labels.append(day.strftime('%b %d'))
        daily_data.append(float(amt))

    monthly_labels, monthly_data = [], []
    for i in range(5, -1, -1):
        m_start = today.replace(day=1) - relativedelta(months=i)
        m_end   = m_start + relativedelta(months=1)
        amt = bill_qs.filter(
            inv_date__gte=m_start,
            inv_date__lt=m_end
        ).aggregate(Sum('total'))['total__sum'] or 0
        monthly_labels.append(m_start.strftime('%b %Y'))
        monthly_data.append(float(amt))

    top_farmers = []
    for f in Farmer.objects.all():
        rev = bill_qs.filter(farmer=f).aggregate(Sum('total'))['total__sum'] or 0
        if rev > 0:
            top_farmers.append({'name': f.name, 'revenue': float(rev)})
    top_farmers = sorted(top_farmers, key=lambda x: x['revenue'], reverse=True)[:5]

    recent_bills = bill_qs.select_related('farmer').order_by('-saved_at')[:10]

    # ── Revenue by Product ──
    product_revenue_raw = (
        BillItem.objects
        .values('desc')
        .annotate(revenue=Sum(F('qty') * F('rate')))
        .order_by('-revenue')[:6]
    )
    product_names    = json.dumps([p['desc'] for p in product_revenue_raw])
    product_revenues = json.dumps([float(p['revenue']) for p in product_revenue_raw])

    return render(request, "dairy/sales.html", {
        'today_sales':      today_sales,
        'month_sales':      month_sales,
        'total_sales':      total_sales,
        'recent_bills':     recent_bills,
        'daily_labels':     json.dumps(daily_labels),
        'daily_data':       json.dumps(daily_data),
        'monthly_labels':   json.dumps(monthly_labels),
        'monthly_data':     json.dumps(monthly_data),
        'farmer_names':     json.dumps([f['name'] for f in top_farmers]),
        'farmer_revenues':  json.dumps([f['revenue'] for f in top_farmers]),
        'product_names':    product_names,
        'product_revenues': product_revenues,
    })