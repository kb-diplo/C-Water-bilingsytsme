namespace MyApi.Models;

public record UserResponse(string Message, string Username, string Role)
{
    public string? Token { get; init; }
    public string? Email { get; init; }
    public object? DashboardData { get; init; }
}

// Dashboard response models
public record DashboardResponse(
    string Role,
    object Stats,
    object? Data = null
);

public record AdminDashboardStats(
    int TotalCustomers,
    int TotalBills,
    decimal TotalRevenue,
    int UnpaidBills
);

public record MeterReaderDashboardStats(
    int TotalReadings,
    int TodayReadings,
    int TotalCustomers
);

public record CustomerDashboardStats(
    int CurrentBills,
    decimal TotalOwed,
    DateTime? LastPayment
);
