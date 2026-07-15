package com.example.orderservice.service;

import com.example.orderservice.client.ProductClient;
import com.example.orderservice.client.UserClient;
import com.example.orderservice.dto.ProductResponse;
import com.example.orderservice.dto.UserResponse;
import com.example.orderservice.entity.Order;
import com.example.orderservice.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserClient userClient;
    private final ProductClient productClient;

    public OrderService(OrderRepository orderRepository, UserClient userClient, ProductClient productClient) {
        this.orderRepository = orderRepository;
        this.userClient = userClient;
        this.productClient = productClient;
    }

    public Order placeOrder(Long userId, Long productId) {
        UserResponse user = userClient.getUserById(userId);
        if (user == null) throw new RuntimeException("User not found with id: " + userId);

        ProductResponse product = productClient.getProductById(productId);
        if (product == null) throw new RuntimeException("Product not found with id: " + productId);

        Order order = new Order(userId, productId);
        Order saved = orderRepository.save(order);
        productClient.reduceStock(productId);
        return saved;
    }

    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    public List<Order> getOrdersByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    public Order updateStatus(Long orderId, String status) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + orderId));
        order.setStatus(Order.Status.valueOf(status.toUpperCase()));
        return orderRepository.save(order);
    }
}
