namespace MyApi.Models;

public record UserDto(
    int Id,
    string Username,
    string Email,
    string Role,
    bool IsBootstrap,
    bool IsActive,
    DateTime CreatedDate);
