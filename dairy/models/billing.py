from django.db import models
from django.contrib.auth.models import User
from .farmer import Farmer


class Bill(models.Model):
    farmer     = models.ForeignKey(Farmer, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='bills')
    inv_no     = models.CharField(max_length=50)
    inv_date   = models.DateField()
    cust_name  = models.CharField(max_length=100, blank=True)
    cust_addr  = models.CharField(max_length=255, blank=True)
    cust_phone = models.CharField(max_length=20,  blank=True)
    total      = models.FloatField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='bills_created')
    saved_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-saved_at']

    def __str__(self):
        return f"{self.inv_no} — {self.cust_name or 'Walk-in'}"


class BillItem(models.Model):
    bill  = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    desc  = models.CharField(max_length=200)
    qty   = models.FloatField()
    rate  = models.FloatField()

    @property
    def amount(self):
        return self.qty * self.rate

    def __str__(self):
        return f"{self.desc} x {self.qty}"
