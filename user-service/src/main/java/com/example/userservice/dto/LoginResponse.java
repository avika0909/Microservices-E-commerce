package com.example.userservice.dto;

public class LoginResponse {

    private Long id;
    private String token;
    private String name;
    private String email;
    private String role;

    public LoginResponse(Long id, String token, String name, String email, String role) {
        this.id = id;
        this.token = token;
        this.name = name;
        this.email = email;
        this.role = role;
    }

    public Long getId() { return id; }
    public String getToken() { return token; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
}
