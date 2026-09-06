package com.thelastwebsite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TheLastWebsiteApplication {

    public static void main(String[] args) {
        SpringApplication.run(TheLastWebsiteApplication.class, args);
    }

}