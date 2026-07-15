package com.example.userservice.config;

import com.example.userservice.entity.User;
import com.example.userservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("admin@shop.com")) {
            User admin = new User("Admin", "admin@shop.com", passwordEncoder.encode("admin123"), User.Role.ADMIN);
            userRepository.save(admin);
            System.out.println(">>> Admin user created: admin@shop.com / admin123");
        }
    }
}
