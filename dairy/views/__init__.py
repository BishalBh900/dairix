from .auth_views import (
    get_role,
    user_logout,
    user_login,
    signup_view,
    root,
    profile_view,
)

from .dashboard_views import (
    dashboard,
    farmer_dashboard,
)

from .farmer_views import (
    farmers,
    add_farmer,
    delete_farmer,
    upload_farmer_photo,
)

from .milk_views import (
    milk,
)

from .billing_views import (
    billing,
    save_bill,
    get_bills,
    delete_bill_view,
)

from .sales_views import (
    sales,
)

from .purchase_views import (
    purchases,
    delete_purchase,
    purchase_detail_api,
)

from .report_views import (
    reports,
    farmer_history_api,  # NEW
)

from .notice_views import (
    get_notices,
    manage_notice,
    delete_notice,
    unread_notice_count,
)

# About view (simple enough to keep inline)
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

@login_required(login_url='login')
def about(request):
    return render(request, "dairy/about.html")