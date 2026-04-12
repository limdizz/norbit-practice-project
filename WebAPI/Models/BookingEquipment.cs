using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI.Models;

public partial class BookingEquipment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int BookingEquipmentId { get; set; }

    [Column("booking_uid")]
    public Guid BookingUid { get; set; }

    [Column("equipment_id")]
    public int EquipmentId { get; set; }

    public int? Quantity { get; set; }

    [ForeignKey("BookingUid")]
    [InverseProperty("BookingEquipments")]
    public virtual BookingsAdvanced? BookingsAdvanced { get; set; }

    [ForeignKey("EquipmentId")]
    [InverseProperty("BookingEquipments")]
    public virtual Equipment? Equipment { get; set; }
}
