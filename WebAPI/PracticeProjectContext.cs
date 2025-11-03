using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using WebAPI.Models;
using WebAPI.Procedures;

namespace WebAPI;

public partial class PracticeProjectContext : DbContext
{
    public PracticeProjectContext()
    {
    }

    public PracticeProjectContext(DbContextOptions<PracticeProjectContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Bill> Bills { get; set; }

    public virtual DbSet<BillItem> BillItems { get; set; }

    public virtual DbSet<BillItemsAdvanced> BillItemsAdvanceds { get; set; }

    public virtual DbSet<BillsAdvanced> BillsAdvanceds { get; set; }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<BookingEquipment> BookingEquipments { get; set; }

    public virtual DbSet<BookingsAdvanced> BookingsAdvanceds { get; set; }

    public virtual DbSet<Equipment> Equipment { get; set; }

    public virtual DbSet<FindRoomAndEquipment> FindRoomAndEquipments { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<RoomEquipment> RoomEquipments { get; set; }

    public virtual DbSet<RoomType> RoomTypes { get; set; }

    public virtual DbSet<SelectOnlyStaffUserInfo> SelectOnlyStaffUserInfos { get; set; }

    public virtual DbSet<SelectTheMostPopularEquipment> SelectTheMostPopularEquipments { get; set; }

    public virtual DbSet<ShowBookingDetail> ShowBookingDetails { get; set; }

    public virtual DbSet<Staff> Staff { get; set; }

    public virtual DbSet<StaffAdvanced> StaffAdvanceds { get; set; }

    public virtual DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }

    public virtual DbSet<SumMonthlyIncome> SumMonthlyIncomes { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserSubscription> UserSubscriptions { get; set; }

    public virtual DbSet<UserSubscriptionsAdvanced> UserSubscriptionsAdvanceds { get; set; }

    public virtual DbSet<UsersAdvanced> UsersAdvanceds { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        => optionsBuilder.UseNpgsql("Host=localhost;Port=5432;Database=practice_project;Username=postgres;Password=1234");

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresExtension("pgcrypto")
            .HasPostgresExtension("uuid-ossp");

        modelBuilder.Entity<Bill>(entity =>
        {
            entity.HasKey(e => e.BillId).HasName("bills_pkey");

            entity.ToTable("bills");

            entity.Property(e => e.BillId).HasColumnName("bill_id");
            entity.Property(e => e.BookingId)
                .ValueGeneratedOnAdd()
                .HasColumnName("booking_id");
            entity.Property(e => e.CreationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("creation_date");
            entity.Property(e => e.PaymentStatus)
                .HasColumnType("character varying")
                .HasColumnName("payment_status");
            entity.Property(e => e.SubscriptionId)
                .ValueGeneratedOnAdd()
                .HasColumnName("subscription_id");
            entity.Property(e => e.SubscriptionUsed).HasColumnName("subscription_used");
            entity.Property(e => e.TotalSum)
                .HasPrecision(10, 2)
                .HasColumnName("total_sum");
            entity.Property(e => e.UserId)
                .ValueGeneratedOnAdd()
                .HasColumnName("user_id");

            entity.HasOne(d => d.Booking).WithMany(p => p.Bills)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bills_bookings_fkey");

            entity.HasOne(d => d.Subscription).WithMany(p => p.Bills)
                .HasForeignKey(d => d.SubscriptionId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bills_usersubs_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Bills)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bills_users_fkey");
        });

        modelBuilder.Entity<BillItem>(entity =>
        {
            entity.HasKey(e => e.BillItemId).HasName("bill_items_pkey");

            entity.ToTable("bill_items");

            entity.Property(e => e.BillItemId).HasColumnName("bill_item_id");
            entity.Property(e => e.BillId)
                .ValueGeneratedOnAdd()
                .HasColumnName("bill_id");
            entity.Property(e => e.ItemName)
                .HasColumnType("character varying")
                .HasColumnName("item_name");
            entity.Property(e => e.ItemType)
                .HasColumnType("character varying")
                .HasColumnName("item_type");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(10, 2)
                .HasColumnName("unit_price");

            entity.HasOne(d => d.Bill).WithMany(p => p.BillItems)
                .HasForeignKey(d => d.BillId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("billitems_bills_fkey");
        });

        modelBuilder.Entity<BillItemsAdvanced>(entity =>
        {
            entity.HasKey(e => e.BillItemId).HasName("bill_items_advanced_pkey");

            entity.ToTable("bill_items_advanced");

            entity.Property(e => e.BillItemId)
                .ValueGeneratedNever()
                .HasColumnName("bill_item_id");
            entity.Property(e => e.BillUid).HasColumnName("bill_uid");
            entity.Property(e => e.ItemName)
                .HasColumnType("character varying")
                .HasColumnName("item_name");
            entity.Property(e => e.ItemType)
                .HasColumnType("character varying")
                .HasColumnName("item_type");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(10, 2)
                .HasColumnName("unit_price");

            entity.HasOne(d => d.BillU).WithMany(p => p.BillItemsAdvanceds)
                .HasForeignKey(d => d.BillUid)
                .HasConstraintName("billitems_bills_fkey");
        });

        modelBuilder.Entity<BillsAdvanced>(entity =>
        {
            entity.HasKey(e => e.BillUid).HasName("bills_advanced_pkey");

            entity.ToTable("bills_advanced");

            entity.Property(e => e.BillUid)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("bill_uid");
            entity.Property(e => e.BookingUid).HasColumnName("booking_uid");
            entity.Property(e => e.CreationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("creation_date");
            entity.Property(e => e.PaymentStatus)
                .HasColumnType("character varying")
                .HasColumnName("payment_status");
            entity.Property(e => e.SubscriptionUid).HasColumnName("subscription_uid");
            entity.Property(e => e.SubscriptionUsed).HasColumnName("subscription_used");
            entity.Property(e => e.TotalSum)
                .HasPrecision(10, 2)
                .HasColumnName("total_sum");
            entity.Property(e => e.UserUid).HasColumnName("user_uid");

            entity.HasOne(d => d.Bookin).WithMany(p => p.BillsAdvanceds)
                .HasForeignKey(d => d.BookingUid)
                .HasConstraintName("bills_bookings_fkey");

            entity.HasOne(d => d.SubscriptionU).WithMany(p => p.BillsAdvanceds)
                .HasForeignKey(d => d.SubscriptionUid)
                .HasConstraintName("bills_usersubs_fkey");

            entity.HasOne(d => d.UserU).WithMany(p => p.BillsAdvanceds)
                .HasForeignKey(d => d.UserUid)
                .HasConstraintName("bills_users_fkey");
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.HasKey(e => e.BookingId).HasName("bookings_pkey");

            entity.ToTable("bookings");

            entity.Property(e => e.BookingId).HasColumnName("booking_id");
            entity.Property(e => e.CreationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("creation_date");
            entity.Property(e => e.EndTime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("end_time");
            entity.Property(e => e.RoomId)
                .ValueGeneratedOnAdd()
                .HasColumnName("room_id");
            entity.Property(e => e.StaffId)
                .ValueGeneratedOnAdd()
                .HasColumnName("staff_id");
            entity.Property(e => e.StartTime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("start_time");
            entity.Property(e => e.Status)
                .HasColumnType("character varying")
                .HasColumnName("status");
            entity.Property(e => e.UserId)
                .ValueGeneratedOnAdd()
                .HasColumnName("user_id");

            entity.HasOne(d => d.Room).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.RoomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookings_rooms_fkey");

            entity.HasOne(d => d.Staff).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.StaffId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookings_staff_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("booking_users_fkey");
        });

        modelBuilder.Entity<BookingEquipment>(entity =>
        {
            entity.HasKey(e => e.BookingEquipmentId).HasName("booking_equipment_pkey");

            entity.ToTable("booking_equipment");

            entity.Property(e => e.BookingEquipmentId).HasColumnName("booking_equipment_id");
            entity.Property(e => e.BookingId)
                .ValueGeneratedOnAdd()
                .HasColumnName("booking_id");
            entity.Property(e => e.EquipmentId)
                .ValueGeneratedOnAdd()
                .HasColumnName("equipment_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.HasOne(d => d.Booking).WithMany(p => p.BookingEquipments)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookingeq_bookings_fkey");

            entity.HasOne(d => d.Equipment).WithMany(p => p.BookingEquipments)
                .HasForeignKey(d => d.EquipmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("bookingeq_equipment_fkey");
        });

        modelBuilder.Entity<BookingsAdvanced>(entity =>
        {
            entity.HasKey(e => e.BookingUid).HasName("bookings_advanced_pkey");

            entity.ToTable("bookings_advanced");

            entity.Property(e => e.BookingUid)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("booking_uid");
            entity.Property(e => e.CreationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("creation_date");
            entity.Property(e => e.EndTime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("end_time");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.StaffUid).HasColumnName("staff_uid");
            entity.Property(e => e.StartTime)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("start_time");
            entity.Property(e => e.Status)
                .HasColumnType("character varying")
                .HasColumnName("status");
            entity.Property(e => e.UserUid).HasColumnName("user_uid");

            entity.HasOne(d => d.Room).WithMany(p => p.BookingsAdvanceds)
                .HasForeignKey(d => d.RoomId)
                .HasConstraintName("bookings_rooms_fkey");

            entity.HasOne(d => d.StaffU).WithMany(p => p.BookingsAdvanceds)
                .HasForeignKey(d => d.StaffUid)
                .HasConstraintName("bookings_staff_fkey");

            entity.HasOne(d => d.UserU).WithMany(p => p.BookingsAdvanceds)
                .HasForeignKey(d => d.UserUid)
                .HasConstraintName("booking_users_fkey");
        });

        modelBuilder.Entity<Equipment>(entity =>
        {
            entity.HasKey(e => e.EquipmentId).HasName("equipment_pkey");

            entity.ToTable("equipment");

            entity.Property(e => e.EquipmentId).HasColumnName("equipment_id");
            entity.Property(e => e.Category)
                .HasColumnType("character varying")
                .HasColumnName("category");
            entity.Property(e => e.CurrentCondition)
                .HasColumnType("character varying")
                .HasColumnName("current_condition");
            entity.Property(e => e.IsRentable).HasColumnName("is_rentable");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.RentalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("rental_price");
        });

        modelBuilder.Entity<FindRoomAndEquipment>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("find_room_and_equipment");

            entity.Property(e => e.Category)
                .HasColumnType("character varying")
                .HasColumnName("category");
            entity.Property(e => e.CurrentCondition)
                .HasColumnType("character varying")
                .HasColumnName("current_condition");
            entity.Property(e => e.EquipmentId).HasColumnName("equipment_id");
            entity.Property(e => e.IsRentable).HasColumnName("is_rentable");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.RentalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("rental_price");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.RoomId).HasName("rooms_pkey");

            entity.ToTable("rooms");

            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.IsFree)
                .HasDefaultValue(true)
                .HasColumnName("is_free");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.RoomTypeId)
                .ValueGeneratedOnAdd()
                .HasColumnName("room_type_id");

            entity.HasOne(d => d.RoomType).WithMany(p => p.Rooms)
                .HasForeignKey(d => d.RoomTypeId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("rooms_room_types_fkey");
        });

        modelBuilder.Entity<RoomEquipment>(entity =>
        {
            entity.HasKey(e => new { e.RoomId, e.EquipmentId }).HasName("room_equipment_pkey");

            entity.ToTable("room_equipment");

            entity.Property(e => e.RoomId)
                .ValueGeneratedOnAdd()
                .HasColumnName("room_id");
            entity.Property(e => e.EquipmentId)
                .HasDefaultValueSql("nextval('room_equipment_equiment_id_seq'::regclass)")
                .HasColumnName("equipment_id");
            entity.Property(e => e.Quantity)
                .HasDefaultValue(1)
                .HasColumnName("quantity");

            entity.HasOne(d => d.Equipment).WithMany(p => p.RoomEquipments)
                .HasForeignKey(d => d.EquipmentId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("roomeq_equipment_fkey");

            entity.HasOne(d => d.Room).WithMany(p => p.RoomEquipments)
                .HasForeignKey(d => d.RoomId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("roomeq_roomid_fkey");
        });

        modelBuilder.Entity<RoomType>(entity =>
        {
            entity.HasKey(e => e.RoomTypeId).HasName("room_types_pkey");

            entity.ToTable("room_types");

            entity.Property(e => e.RoomTypeId).HasColumnName("room_type_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.RentalPricePerHour)
                .HasPrecision(10, 2)
                .HasColumnName("rental_price_per_hour");
        });

        modelBuilder.Entity<SelectOnlyStaffUserInfo>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("select_only_staff_user_info");

            entity.Property(e => e.FireDate).HasColumnName("fire_date");
            entity.Property(e => e.HireDate).HasColumnName("hire_date");
            entity.Property(e => e.RegistrationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("registration_date");
            entity.Property(e => e.StaffId).HasColumnName("staff_id");
            entity.Property(e => e.StaffPosition)
                .HasColumnType("character varying")
                .HasColumnName("staff_position");
            entity.Property(e => e.UserEmail)
                .HasColumnType("character varying")
                .HasColumnName("user_email");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.UserName)
                .HasColumnType("character varying")
                .HasColumnName("user_name");
            entity.Property(e => e.UserPhone)
                .HasMaxLength(12)
                .HasColumnName("user_phone");
            entity.Property(e => e.UserSurname)
                .HasColumnType("character varying")
                .HasColumnName("user_surname");
        });

        modelBuilder.Entity<SelectTheMostPopularEquipment>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("select_the_most_popular_equipment");

            entity.Property(e => e.Category)
                .HasColumnType("character varying")
                .HasColumnName("category");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.TotalRentals).HasColumnName("total_rentals");
        });

        modelBuilder.Entity<ShowBookingDetail>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("show_booking_details");

            entity.Property(e => e.ItemName)
                .HasColumnType("character varying")
                .HasColumnName("item_name");
            entity.Property(e => e.ItemType)
                .HasColumnType("character varying")
                .HasColumnName("item_type");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(10, 2)
                .HasColumnName("unit_price");
        });

        modelBuilder.Entity<Staff>(entity =>
        {
            entity.HasKey(e => e.StaffId).HasName("staff_pkey");

            entity.ToTable("staff");

            entity.Property(e => e.StaffId).HasColumnName("staff_id");
            entity.Property(e => e.FireDate).HasColumnName("fire_date");
            entity.Property(e => e.HireDate).HasColumnName("hire_date");
            entity.Property(e => e.StaffPosition)
                .HasColumnType("character varying")
                .HasColumnName("staff_position");
            entity.Property(e => e.UserId)
                .ValueGeneratedOnAdd()
                .HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Staff)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("staff_users_fkey");
        });

        modelBuilder.Entity<StaffAdvanced>(entity =>
        {
            entity.HasKey(e => e.StaffUid).HasName("staff_advanced_pkey");

            entity.ToTable("staff_advanced");

            entity.Property(e => e.StaffUid)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("staff_uid");
            entity.Property(e => e.FireDate).HasColumnName("fire_date");
            entity.Property(e => e.HireDate).HasColumnName("hire_date");
            entity.Property(e => e.StaffPosition)
                .HasColumnType("character varying")
                .HasColumnName("staff_position");
            entity.Property(e => e.UserUid).HasColumnName("user_uid");

            entity.HasOne(d => d.UserU).WithMany(p => p.StaffAdvanceds)
                .HasForeignKey(d => d.UserUid)
                .HasConstraintName("staff_users_fkey");
        });

        modelBuilder.Entity<SubscriptionPlan>(entity =>
        {
            entity.HasKey(e => e.PlanId).HasName("subscription_plans_pkey");

            entity.ToTable("subscription_plans");

            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PlanName)
                .HasColumnType("character varying")
                .HasColumnName("plan_name");
            entity.Property(e => e.SessionsCount).HasColumnName("sessions_count");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(10, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.ValidityDays).HasColumnName("validity_days");
        });

        modelBuilder.Entity<SumMonthlyIncome>(entity =>
        {
            entity
                .HasNoKey()
                .ToView("sum_monthly_income");

            entity.Property(e => e.Month).HasColumnName("month");
            entity.Property(e => e.TotalIncome).HasColumnName("total_income");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("users_pkey");

            entity.ToTable("users");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.RegistrationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("registration_date");
            entity.Property(e => e.UserEmail)
                .HasColumnType("character varying")
                .HasColumnName("user_email");
            entity.Property(e => e.UserName)
                .HasColumnType("character varying")
                .HasColumnName("user_name");
            entity.Property(e => e.UserPhone)
                .HasMaxLength(12)
                .HasColumnName("user_phone");
            entity.Property(e => e.UserSurname)
                .HasColumnType("character varying")
                .HasColumnName("user_surname");
        });

        modelBuilder.Entity<UserSubscription>(entity =>
        {
            entity.HasKey(e => e.SubscriptionId).HasName("user_subscriptions_pkey");

            entity.ToTable("user_subscriptions");

            entity.Property(e => e.SubscriptionId)
                .ValueGeneratedNever()
                .HasColumnName("subscription_id");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(true)
                .HasColumnName("is_active");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PurchaseDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("purchase_date");
            entity.Property(e => e.SessionsRemaining).HasColumnName("sessions_remaining");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.ValidUntil)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("valid_until");

            entity.HasOne(d => d.Plan).WithMany(p => p.UserSubscriptions)
                .HasForeignKey(d => d.PlanId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("usersub_subplans_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.UserSubscriptions)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("usersub_users_fkey");
        });

        modelBuilder.Entity<UserSubscriptionsAdvanced>(entity =>
        {
            entity.HasKey(e => e.SubscriptionUid).HasName("user_subscriptions_advanced_pkey");

            entity.ToTable("user_subscriptions_advanced");

            entity.Property(e => e.SubscriptionUid)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("subscription_uid");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.PlanId).HasColumnName("plan_id");
            entity.Property(e => e.PurchaseDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("purchase_date");
            entity.Property(e => e.SessionsRemaining).HasColumnName("sessions_remaining");
            entity.Property(e => e.UserUid).HasColumnName("user_uid");
            entity.Property(e => e.ValidUntil)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("valid_until");

            entity.HasOne(d => d.Plan).WithMany(p => p.UserSubscriptionsAdvanceds)
                .HasForeignKey(d => d.PlanId)
                .HasConstraintName("usersub_subplans_fkey");

            entity.HasOne(d => d.UserU).WithMany(p => p.UserSubscriptionsAdvanceds)
                .HasForeignKey(d => d.UserUid)
                .HasConstraintName("usersub_users_fkey");
        });

        modelBuilder.Entity<UsersAdvanced>(entity =>
        {
            entity.HasKey(e => e.UserUid).HasName("users_advanced_pkey");

            entity.ToTable("users_advanced");

            entity.Property(e => e.UserUid)
                .HasDefaultValueSql("uuid_generate_v4()")
                .HasColumnName("user_uid");
            entity.Property(e => e.Email)
                .HasColumnType("character varying")
                .HasColumnName("email");
            entity.Property(e => e.Name)
                .HasColumnType("character varying")
                .HasColumnName("name");
            entity.Property(e => e.PasswordHash)
                .HasDefaultValueSql("gen_random_bytes(12)")
                .HasColumnType("character varying")
                .HasColumnName("password_hash");
            entity.Property(e => e.PasswordOrigin)
                .HasColumnType("character varying")
                .HasColumnName("password_origin");
            entity.Property(e => e.PasswordSalt)
                .HasColumnType("character varying")
                .HasColumnName("password_salt");
            entity.Property(e => e.Phone)
                .HasMaxLength(12)
                .HasColumnName("phone");
            entity.Property(e => e.RegistrationDate)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("registration_date");
            entity.Property(e => e.Surname)
                .HasColumnType("character varying")
                .HasColumnName("surname");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
