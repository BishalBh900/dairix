from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from ..models import Notice, NoticeRead
from ..decorators import admin_only
from ..utils import get_role


@login_required(login_url='login')
def get_notices(request):
    notices  = Notice.objects.filter(is_active=True).order_by('-created_at')[:20]
    read_ids = NoticeRead.objects.filter(
        user=request.user
    ).values_list('notice_id', flat=True)
    return JsonResponse({'notices': [{
        'id':         n.id,
        'title':      n.title,
        'message':    n.message,
        'image':      n.image.url if n.image else None,
        'created_at': n.created_at.strftime('%b %d, %Y'),
        'unread':     n.id not in read_ids,
    } for n in notices]})


@login_required(login_url='login')
def manage_notice(request):
    if request.method == 'POST':
        if get_role(request.user) not in ('admin', 'staff'):
            return redirect('manage_notice')
        title   = request.POST.get('title', '').strip()
        message = request.POST.get('message', '').strip()
        image   = request.FILES.get('image')
        if title:
            Notice.objects.create(
                title=title, message=message,
                image=image, created_by=request.user
            )
        return redirect('manage_notice')

    notices  = Notice.objects.filter(is_active=True).order_by('-created_at')
    read_ids = set(NoticeRead.objects.filter(
        user=request.user
    ).values_list('notice_id', flat=True))

    for n in notices.exclude(id__in=read_ids):
        NoticeRead.objects.get_or_create(user=request.user, notice=n)

    return render(request, 'dairy/manage_notice.html', {
        'notices':  notices,
        'read_ids': read_ids,
    })


@login_required(login_url='login')
@admin_only
def delete_notice(request, pk):
    if request.method == 'POST':
        get_object_or_404(Notice, pk=pk).delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False})


@login_required(login_url='login')
def unread_notice_count(request):
    read_ids = NoticeRead.objects.filter(
        user=request.user
    ).values_list('notice_id', flat=True)
    count = Notice.objects.filter(is_active=True).exclude(id__in=read_ids).count()
    return JsonResponse({'count': count})
