namespace MyApi.Models;

public record UserDto(
    int Id,
    string Username,
    string Role,
    bool IsBootstrap,
    bool IsActive);
