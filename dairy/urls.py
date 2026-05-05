from django.urls import path
from . import views

urlpatterns = [
    path('', views.root, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('farmer/dashboard/', views.farmer_dashboard, name='farmer_dashboard'),
    path('login/',  views.user_login,  name='login'),
    path('signup/', views.signup_view, name='signup'),
    path('logout/', views.user_logout, name='logout'),
    path('farmers/',                views.farmers,       name='farmers'),
    path('add-farmer/',             views.add_farmer,    name='add_farmer'),
    path('delete-farmer/<int:id>/', views.delete_farmer, name='delete_farmer'),
    path('farmers/<int:farmer_id>/photo/', views.upload_farmer_photo, name='upload_farmer_photo'),
    path('milk/', views.milk, name='milk'),
    path('billing/',                       views.billing,          name='billing'),
    path('billing/save/',                  views.save_bill,        name='save_bill'),
    path('billing/list/',                  views.get_bills,        name='get_bills'),
    path('billing/delete/<int:bill_id>/',  views.delete_bill_view, name='delete_bill'),
    path('sales/', views.sales, name='sales'),
    path('about/', views.about, name='about'),
    path('reports/', views.reports, name='reports'),
    path('reports/farmer-history/', views.farmer_history_api, name='farmer_history_api'),  # NEW
    path('purchases/',                    views.purchases,       name='purchases'),
    path('purchases/delete/<int:pk>/',    views.delete_purchase, name='delete_purchase'),
    path('purchases/<int:pk>/detail/', views.purchase_detail_api, name='purchase_detail'),

    # 📢 NOTICES
    path('notices/',                   views.get_notices,        name='get_notices'),
    path('notices/manage/',            views.manage_notice,      name='manage_notice'),
    path('notices/delete/<int:pk>/',   views.delete_notice,      name='delete_notice'),
    path('notices/unread-count/',      views.unread_notice_count, name='unread_notice_count'),
    path('profile/', views.profile_view, name='profile'),
]