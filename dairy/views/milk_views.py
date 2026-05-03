from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from datetime import date, timedelta
import json

from ..models import Farmer, MilkCollection
from ..decorators import admin_or_staff_required
from ..utils import get_role


@login_required(login_url='login')
def milk(request):
    role   = get_role(request.user)
    farmer = None

    if role == 'farmer':
        try:
            farmer = request.user.farmer_profile
        except Farmer.DoesNotExist:
            messages.error(request, "No farmer profile linked.")
            return redirect('login')

    farmers_all = Farmer.objects.all()

    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        try:
            data = json.loads(request.body)

            farmer_id    = data.get('farmer_id')
            quantity     = float(data.get('quantity', 0))
            fat          = float(data.get('fat', 0))
            snf          = float(data.get('snf', 0))
            rate         = float(data.get('rate', 0))
            allowances   = float(data.get('allowances', 0))
            total_amount = float(data.get('total_amount', 0))
            session      = data.get('session', 'Morning')
            entry_date   = data.get('date', date.today().isoformat())

            if not farmer_id:
                return JsonResponse({'success': False, 'error': 'Farmer is required.'}, status=400)
            if quantity <= 0:
                return JsonResponse({'success': False, 'error': 'Quantity must be greater than 0.'}, status=400)

            farmer_obj = get_object_or_404(Farmer, id=farmer_id)

            obj, created = MilkCollection.objects.update_or_create(
                farmer  = farmer_obj,
                date    = entry_date,
                session = session,
                defaults={
                    'quantity':     quantity,
                    'fat':          fat,
                    'snf':          snf,
                    'rate':         rate,
                    'allowances':   allowances,
                    'total_amount': total_amount,
                }
            )

            return JsonResponse({
                'success':      True,
                'created':      created,
                'id':           obj.id,
                'farmer_name':  farmer_obj.name,
                'quantity':     obj.quantity,
                'fat':          obj.fat,
                'snf':          obj.snf,
                'rate':         obj.rate,
                'total_amount': obj.total_amount,
                'session':      obj.session,
                'date':         str(obj.date),
            })

        except Farmer.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Farmer not found.'}, status=404)
        except (ValueError, TypeError) as e:
            return JsonResponse({'success': False, 'error': f'Invalid data: {str(e)}'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=500)

    today_date     = date.today()
    morning_done   = MilkCollection.objects.filter(date=today_date, session='Morning').exists()
    active_session = 'Evening' if morning_done else 'Morning'

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest-Panel':
        panel_date    = request.GET.get('panel_date', str(today_date))
        panel_session = request.GET.get('panel_session', active_session)
        qs = MilkCollection.objects.select_related('farmer').filter(
            date=panel_date, session=panel_session
        ).order_by('farmer__name')
        records = [{
            'farmer_name':  r.farmer.name,
            'quantity':     r.quantity,
            'fat':          r.fat,
            'snf':          r.snf,
            'rate':         r.rate,
            'total_amount': r.total_amount,
        } for r in qs]
        return JsonResponse({'records': records})

    if role == 'farmer':
        period    = request.GET.get('period', '')
        from_date = request.GET.get('from_date', '')
        to_date   = request.GET.get('to_date', '')

        qs = MilkCollection.objects.filter(farmer=farmer).order_by('-date', '-session')

        if period == 'week':
            qs = qs.filter(date__gte=today_date - timedelta(days=7))
        elif period == 'month':
            qs = qs.filter(date__gte=today_date.replace(day=1))
        elif period == 'custom' and from_date and to_date:
            qs = qs.filter(date__range=[from_date, to_date])

        return render(request, "dairy/milk.html", {
            "role":          role,
            "farmer":        farmer,
            "records":       qs,
            "active_period": period,
            "from_date":     from_date,
            "to_date":       to_date,
        })

    session_records = MilkCollection.objects.select_related('farmer').filter(
        date=today_date, session=active_session
    ).order_by('farmer__name')

    return render(request, "dairy/milk.html", {
        "farmers":         farmers_all,
        "session_records": session_records,
        "active_session":  active_session,
        "today_date":      today_date,
        "read_only":       False,
        "role":            role,
        "farmer":          farmer,
    })
