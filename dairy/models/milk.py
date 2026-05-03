from django.db import models
from .farmer import Farmer


class MilkCollection(models.Model):

    SESSION_CHOICES = [
        ("Morning", "Morning"),
        ("Evening", "Evening"),
    ]

    farmer       = models.ForeignKey(Farmer, on_delete=models.CASCADE)
    quantity     = models.FloatField()
    fat          = models.FloatField()
    snf          = models.FloatField()
    rate         = models.FloatField(default=0)
    allowances   = models.FloatField(default=0)
    total_amount = models.FloatField()
    date         = models.DateField()
    session      = models.CharField(max_length=10, choices=SESSION_CHOICES)

    class Meta:
        unique_together = ("farmer", "date", "session")

    def __str__(self):
        return f"{self.farmer.name} - {self.date} - {self.session}"
