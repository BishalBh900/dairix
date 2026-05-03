from django.db import models
from django.contrib.auth.models import User


class Purchase(models.Model):
    inv_no      = models.CharField(max_length=50)
    inv_date    = models.DateField()
    vendor      = models.CharField(max_length=150)
    particulars = models.CharField(max_length=500, blank=True, default='')
    amount      = models.FloatField(default=0)
    notes       = models.TextField(blank=True, default='')
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='purchases')
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-inv_date', '-created_at']

    def __str__(self):
        return f"{self.inv_no} — {self.vendor}"


class PurchaseItem(models.Model):
    purchase    = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=255)
    quantity    = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit        = models.CharField(max_length=50, blank=True)
    rate        = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.description} x {self.quantity}"
