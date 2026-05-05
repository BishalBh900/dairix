from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Avg
from datetime import date, timedelta
import json

from ..models import Farmer, MilkCollection, Bill
from ..decorators import admin_or_staff_required, farmer_only
from ..utils import get_role


@login_required(login_url='login')
@admin_or_staff_required
def dashboard(request):
    today = date.today()

    labels, chart_data = [], []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        qty = MilkCollection.objects.filter(date=day).aggregate(
            Sum('quantity'))['quantity__sum'] or 0
        labels.append(day.strftime("%b %d"))
        chart_data.append(float(qty))

    morning = MilkCollection.objects.filter(
        date=today, session='Morning').aggregate(
        Sum('quantity'))['quantity__sum'] or 0
    evening = MilkCollection.objects.filter(
        date=today, session='Evening').aggregate(
        Sum('quantity'))['quantity__sum'] or 0

    avg_fat = MilkCollection.objects.filter(
        date=today).aggregate(Avg('fat'))['fat__avg'] or 0
    avg_snf = MilkCollection.objects.filter(
        date=today).aggregate(Avg('snf'))['snf__avg'] or 0

    top_farmers = sorted([
        {
            'name': f.name,
            'milk': MilkCollection.objects.filter(farmer=f).aggregate(
                Sum('quantity'))['quantity__sum'] or 0
        }
        for f in Farmer.objects.all()
    ], key=lambda x: x['milk'], reverse=True)[:3]

    recent = MilkCollection.objects.select_related('farmer').order_by('-date', '-id')[:5]

    last_3_days_milk = MilkCollection.objects.filter(
        date__gte=today - timedelta(days=2)
    ).aggregate(Sum('quantity'))['quantity__sum'] or 0

    total_sales = Bill.objects.aggregate(Sum('total'))['total__sum'] or 0

    return render(request, "dairy/dashboard.html", {
        "total_farmers":    Farmer.objects.count(),
        "today_milk":       morning + evening,
        "morning_milk":     morning,
        "evening_milk":     evening,
        "last_3_days_milk": last_3_days_milk,
        "total_sales":      total_sales,
        "avg_fat":          round(float(avg_fat), 2),
        "avg_snf":          round(float(avg_snf), 2),
        "top_farmers":      top_farmers,
        "recent":           recent,
        "labels":           labels,
        "data":             chart_data,
    })


@login_required(login_url='login')
@farmer_only
def farmer_dashboard(request):
    try:
        farmer = request.user.farmer_profile
    except Farmer.DoesNotExist:
        from django.contrib import messages
        messages.error(request, "No farmer profile linked to your account.")
        return redirect('login')

    today       = date.today()
    week_start  = today - timedelta(days=6)
    month_start = today.replace(day=1)
    qs          = MilkCollection.objects.filter(farmer=farmer)

    total_milk    = qs.aggregate(Sum('quantity'))['quantity__sum'] or 0
    total_revenue = qs.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
    today_milk    = qs.filter(date=today).aggregate(Sum('quantity'))['quantity__sum'] or 0
    week_milk     = qs.filter(date__gte=week_start).aggregate(Sum('quantity'))['quantity__sum'] or 0
    month_milk    = qs.filter(date__gte=month_start).aggregate(Sum('quantity'))['quantity__sum'] or 0

    labels, chart_data = [], []
    for i in range(6, -1, -1):
        d   = today - timedelta(days=i)
        qty = qs.filter(date=d).aggregate(Sum('quantity'))['quantity__sum'] or 0
        labels.append(d.strftime('%b %d'))
        chart_data.append(round(float(qty), 2))

    recent = qs.order_by('-date', '-session')[:8]
    bills  = Bill.objects.filter(farmer=farmer).order_by('-saved_at')[:5]

    return render(request, 'dairy/farmer_dashboard.html', {
        'farmer':        farmer,
        'total_milk':    total_milk,
        'total_revenue': total_revenue,
        'today_milk':    today_milk,
        'week_milk':     week_milk,
        'month_milk':    month_milk,
        'labels':        json.dumps(labels),
        'chart_data':    json.dumps(chart_data),
        'recent':        recent,
        'bills':         bills,
    })