-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: yabudu_main
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `addons`
--

DROP TABLE IF EXISTS `addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `addons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10,2) DEFAULT '0.00',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `addons_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `addons`
--

LOCK TABLES `addons` WRITE;
/*!40000 ALTER TABLE `addons` DISABLE KEYS */;
/*!40000 ALTER TABLE `addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_sort_order` (`sort_order`),
  KEY `idx_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (15,'КОМБО','комбо',4,'2026-02-03 18:06:58','2026-02-13 03:22:33'),(19,'Акции','акции',7,'2026-02-04 15:35:30','2026-02-13 03:22:33'),(20,'Сеты','сеты',9,'2026-02-04 15:38:03','2026-02-13 03:22:33'),(21,'Классические роллы','классические-роллы',5,'2026-02-04 18:22:00','2026-02-13 03:22:33'),(22,'Фирменные роллы','фирменные-роллы',11,'2026-02-04 18:25:30','2026-02-13 03:22:33'),(23,'Запеченные роллы','запеченные-роллы',3,'2026-02-04 18:31:12','2026-02-13 03:22:33'),(24,'Жареные роллы','жареные-роллы',1,'2026-02-04 18:32:58','2026-02-13 03:22:33'),(25,'Паста','паста',6,'2026-02-04 18:34:00','2026-02-13 03:22:33'),(26,'Пицца','пицца',8,'2026-02-04 23:22:52','2026-02-13 03:22:33'),(27,'Бургеры','бургеры',0,'2026-02-05 20:43:04','2026-02-13 03:22:33'),(28,'Закуски','закуски',2,'2026-02-05 20:43:44','2026-02-13 03:22:33'),(99,'Тест','test',10,'2026-02-11 04:26:45','2026-02-13 03:22:33');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `total_orders` int DEFAULT '0',
  `total_spent` decimal(10,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `idx_phone` (`phone`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'даниил','admin@yabudu.com','+7 (903) 119-74-19','asdfsdfg',NULL,0,0.00,'2026-01-30 17:41:32','2026-02-13 03:22:34'),(3,'даниил','dezin.ru@mail.ru','89223335325',NULL,NULL,0,0.00,'2026-01-30 19:14:32','2026-02-13 03:22:34'),(5,'даниил','onikesao@mail.ru','+7 903 119 74 19',NULL,NULL,0,0.00,'2026-02-09 07:15:53','2026-02-13 03:22:34'),(6,'Irina Dezhina','irkamn76@gmail.com','+79223150626',NULL,NULL,0,0.00,'2026-02-09 13:49:48','2026-02-13 03:22:34');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discounts`
--

DROP TABLE IF EXISTS `discounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'percent',
  `value` decimal(10,2) NOT NULL,
  `min_order_amount` decimal(10,2) DEFAULT '0.00',
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` int DEFAULT '1',
  `valid_from` datetime DEFAULT NULL,
  `valid_to` datetime DEFAULT NULL,
  `usage_limit` int DEFAULT NULL,
  `usage_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discounts`
--

LOCK TABLES `discounts` WRITE;
/*!40000 ALTER TABLE `discounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `discounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_id` int DEFAULT NULL,
  `guest_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guest_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `guest_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'delivery',
  `address` text COLLATE utf8mb4_unicode_ci,
  `street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `building` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `apartment` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entrance` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `floor` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `intercom` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_asap` int DEFAULT '1',
  `delivery_date` date DEFAULT NULL,
  `delivery_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `custom_time` datetime DEFAULT NULL,
  `payment` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'cash',
  `comment` text COLLATE utf8mb4_unicode_ci,
  `items` json NOT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `idx_order_number` (`order_number`),
  KEY `idx_status` (`status`),
  KEY `idx_customer` (`customer_id`),
  KEY `idx_delivery_date` (`delivery_date`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_guest_phone` (`guest_phone`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (91,'ORD-20260211-091',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-11','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1770825987938.8108, \"name\": \"Сет «Сытый папа»\", \"size\": null, \"price\": 1150, \"addons\": [], \"imageUrl\": \"/uploads/products/product_new_1770635407484.webp\", \"quantity\": 1, \"basePrice\": 1150, \"productId\": 38, \"sizeAddons\": []}]',1150.00,'pending','2026-02-11 19:06:39','2026-02-15 22:46:45'),(92,'ORD-20260211-092',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-11','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1770826028134.6265, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-11 19:07:20','2026-02-15 22:46:45'),(93,'ORD-20260212-093',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','4','1234',1,'2026-02-12','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1770898137371.1304, \"name\": \"Сет «Сытый папа»\", \"size\": null, \"price\": 1150, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770635407484.webp\", \"quantity\": 1, \"basePrice\": 1150, \"productId\": 38, \"sizeAddons\": []}]',1150.00,'pending','2026-02-12 15:09:08','2026-02-15 22:46:45'),(94,'ORD-20260214-094',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771016610463.8596, \"name\": \"Японский сендвич с курицей\", \"size\": null, \"price\": 325, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637503532.webp\", \"quantity\": 1, \"basePrice\": 325, \"productId\": 177, \"sizeAddons\": []}]',325.00,'pending','2026-02-14 03:45:14','2026-02-15 22:46:45'),(95,'ORD-20260214-095',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771032316204.142, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 04:26:26','2026-02-15 22:46:45'),(96,'ORD-20260214-096',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','34','12','34','124','543',1,'2026-02-14','Как можно скорее',NULL,'cash','123','[{\"id\": 1771032442013.0923, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 04:27:33','2026-02-15 22:46:45'),(97,'ORD-20260214-097',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771035114604.446, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 05:12:07','2026-02-15 22:46:45'),(98,'ORD-20260214-098',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','12','4','5','6','7',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771036987497.9346, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 05:43:19','2026-02-15 22:46:45'),(99,'ORD-20260214-099',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771038089330.607, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:01:40','2026-02-15 22:46:45'),(100,'ORD-20260214-100',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','4','5','6',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771038756829.364, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:12:46','2026-02-15 22:46:45'),(101,'ORD-20260214-101',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','41','5','1',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771039953211.6577, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:32:58','2026-02-15 22:46:45'),(102,'ORD-20260214-102',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','5',NULL,'123',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771040382744.4077, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:39:55','2026-02-15 22:46:45'),(103,'ORD-20260214-103',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','123','1','5',NULL,'123',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771040813296.2468, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:47:16','2026-02-15 22:46:45'),(104,'ORD-20260214-104',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','3','1','5','4','6',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771040847168.3784, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:47:39','2026-02-15 22:46:45'),(105,'ORD-20260214-105',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','1','2','5','4',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771041540870.5288, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 06:59:17','2026-02-15 22:46:45'),(106,'ORD-20260214-106',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771042124649.8896, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 14:57:58','2026-02-15 22:46:45'),(107,'ORD-20260214-107',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','123',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771074968318.613, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 16:16:22','2026-02-15 22:46:45'),(108,'ORD-20260214-108',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','123','15','35','346','5',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771084592961.6023, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 18:56:45','2026-02-15 22:46:45'),(109,'ORD-20260214-109',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','123','123','5','123','123',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771084634813.5771, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 18:57:30','2026-02-15 22:46:45'),(110,'ORD-20260214-110',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','1','123','543','34',1,'2026-02-14','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771084665668.744, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 18:57:57','2026-02-15 22:46:45'),(111,'ORD-20260214-111',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','46','123','1','5','123',1,'2026-02-14','Как можно скорее',NULL,'transfer',NULL,'[{\"id\": 1771086091387.629, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-14 19:21:47','2026-02-15 22:46:45'),(112,'ORD-20260214-112',NULL,'Тестовый Клиент','+79991234567',NULL,'delivery',NULL,'Тестовая улица','1','10',NULL,NULL,NULL,1,NULL,NULL,NULL,'cash','Тестовый заказ','[{\"name\": \"Бургер\", \"price\": 350, \"quantity\": 2}]',700.00,'pending','2026-02-14 20:44:01','2026-02-15 22:46:45'),(113,'ORD-20260214-113',NULL,'ТестАвтоПечать','+79991112233',NULL,'delivery',NULL,'Тестовая','5','20',NULL,NULL,NULL,1,NULL,NULL,NULL,'card',NULL,'[{\"name\": \"Пицца\", \"price\": 500, \"quantity\": 1}]',500.00,'pending','2026-02-14 20:49:57','2026-02-15 22:46:45'),(114,'ORD-20260214-114',NULL,'СерверПечать','+79990001122',NULL,'delivery',NULL,'ул.Пушкина','10','5',NULL,NULL,NULL,1,NULL,NULL,NULL,'card',NULL,'[{\"name\": \"Роллы\", \"price\": 400, \"quantity\": 2}]',800.00,'pending','2026-02-14 21:24:37','2026-02-15 22:46:45'),(115,'ORD-20260214-115',NULL,'ТестСервер','+79998887766',NULL,'delivery',NULL,'Ленина','1','1',NULL,NULL,NULL,1,NULL,NULL,NULL,'cash',NULL,'[{\"name\": \"Сет\", \"price\": 1200, \"quantity\": 1}]',1200.00,'pending','2026-02-14 21:36:14','2026-02-15 22:46:45'),(116,'ORD-20260214-116',NULL,'ФинальныйТест','+79995554433',NULL,'delivery',NULL,'Центральная','15','8',NULL,NULL,NULL,1,NULL,NULL,NULL,'card',NULL,'[{\"name\": \"Макси\", \"price\": 900, \"quantity\": 1}]',900.00,'pending','2026-02-14 21:49:41','2026-02-15 22:46:45'),(117,'ORD-20260216-000',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-16 23:34:02','2026-02-16 23:34:02'),(121,'ORD-20260216-64J1',NULL,'Test222','9999999999',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[]',100.00,'pending','2026-02-16 23:46:49','2026-02-16 23:46:49'),(122,'ORD-20260216-70LF',NULL,'Test333','8888888888',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-16 23:47:43','2026-02-16 23:47:43'),(123,'ORD-20260217-PYCE',NULL,'Test555','7777777777',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:01:38','2026-02-17 00:01:38'),(124,'ORD-20260217-DLG6',NULL,'Test888','6666666666',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:05:21','2026-02-17 00:05:21'),(125,'ORD-20260217-910C',NULL,'Test111','4444444444',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:14:38','2026-02-17 00:14:38'),(126,'ORD-20260217-4R2P',NULL,'TestABC','3333333333',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:23:04','2026-02-17 00:23:04'),(127,'ORD-20260217-95ZN',NULL,'TestXYZ','2222222222',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:30:33','2026-02-17 00:30:33'),(128,'ORD-20260217-CVYE',NULL,'TestFinal','1111111111',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:44:02','2026-02-17 00:44:02'),(129,'ORD-20260217-RT4O',NULL,'TestDebug','0000000000',NULL,'delivery',NULL,NULL,NULL,NULL,NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,'[{\"id\": 1, \"name\": \"Test\", \"price\": 100, \"quantity\": 1}]',100.00,'pending','2026-02-17 00:48:41','2026-02-17 00:48:41'),(130,'ORD-20260217-7ORD',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:05:53','2026-02-17 01:05:53'),(131,'ORD-20260217-G33Z',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:05:55','2026-02-17 01:05:55'),(132,'ORD-20260217-72LO',NULL,'даниил','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','2','5464','3534',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:06:17','2026-02-17 01:06:17'),(133,'ORD-20260217-Y78K',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:42:43','2026-02-17 01:42:43'),(134,'ORD-20260217-8F1X',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','4','15','123',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:43:16','2026-02-17 01:43:16'),(135,'ORD-20260217-135-Y3',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','34','3',NULL,'4','4',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771270172317.414, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 2, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270174779.3608, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"35 см \", \"price_modifier\": \"0.00\"}, \"price\": 200, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 200, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771270175784.8198, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',1180.00,'pending','2026-02-17 01:50:17','2026-02-17 01:50:17'),(136,'ORD-20260217-136-E4',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','45','567',NULL,'567678',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771282371860.9053, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-17 01:53:06','2026-02-17 01:53:06'),(137,'ORD-20260217-137-0Z',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','12','2','12','2','2',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771282884763.7554, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-17 02:01:37','2026-02-17 02:01:37'),(138,'ORD-20260217-138-V2',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-16','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771283747690.92, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}, {\"id\": 1771283753879.5283, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": \"3000.0000\", \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}]',3600.00,'pending','2026-02-17 02:59:37','2026-02-17 02:59:37'),(139,'ORD-20260217-139-FP',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-17','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771286389515.1997, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}, {\"id\": 1771286392789.1123, \"name\": \"Пицца «Флоренция»\", \"size\": null, \"price\": 380, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636510083.webp\", \"quantity\": 1, \"basePrice\": 380, \"productId\": 164, \"sizeAddons\": []}]',680.00,'pending','2026-02-17 03:00:13','2026-02-17 03:00:13'),(140,'ORD-20260217-140-YN',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-17','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771287138626.0286, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}]',600.00,'pending','2026-02-17 03:12:37','2026-02-17 03:12:37'),(141,'ORD-20260217-141-UZ',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','1','5','1234',1,'2026-02-17','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771336646318.3423, \"name\": \"Мидии киви 5 шт.\", \"size\": null, \"price\": 600, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770637701690.webp\", \"quantity\": 1, \"basePrice\": 600, \"productId\": 176, \"sizeAddons\": []}, {\"id\": 1771336663087.239, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}]',900.00,'pending','2026-02-17 16:57:57','2026-02-17 16:57:57'),(142,'ORD-20260217-142-T9',NULL,'Тестовый Товар для Отчета','+7 903 119 74 19',NULL,'delivery',NULL,'Проффесора малигонова','35','123','45','1','1234',1,'2026-02-17','Как можно скорее',NULL,'cash',NULL,'[{\"id\": 1771342063240.076, \"name\": \"Пицца «Цезарь»\", \"size\": {\"name\": \"25 см \", \"price_modifier\": \"0.00\"}, \"price\": 300, \"addons\": [], \"imageUrl\": \"http://localhost:3001/uploads/products/product_new_1770636595482.webp\", \"quantity\": 1, \"basePrice\": 300, \"productId\": 165, \"sizeAddons\": []}]',300.00,'pending','2026-02-17 18:28:10','2026-02-17 18:28:10');
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `price` decimal(10,2) DEFAULT '0.00',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category_id`),
  KEY `idx_name` (`name`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=178 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (28,'НОВЫЙ ГОД','',1250.00,'/uploads/products/product_new_1770635699906.webp',19,11,'2026-02-04 15:35:41','2026-02-13 03:22:33'),(29,'Основной инстинкт','',1499.00,'/uploads/products/product_new_1770635683749.webp',19,10,'2026-02-04 15:36:05','2026-02-13 03:22:33'),(31,'Сет «Горячий фирменный»','',1200.00,'/uploads/products/product_new_1770635585378.webp',19,9,'2026-02-04 15:36:29','2026-02-13 03:22:33'),(32,'Сет «Запеченный MINI»','',700.00,'/uploads/products/product_new_1770635565193.webp',19,8,'2026-02-04 15:36:38','2026-02-13 03:22:33'),(33,'Сет «ИРОНИЯ СУДЬБЫ»','',1550.00,'/uploads/products/product_new_1770635513027.webp',19,7,'2026-02-04 15:36:46','2026-02-13 03:22:33'),(34,'Сет «Мой золотой»','',1250.00,'/uploads/products/product_new_1770635496456.webp',19,6,'2026-02-04 15:36:53','2026-02-13 03:22:33'),(35,'Сет «Паблито»','',1100.00,'/uploads/products/product_new_1770635457290.webp',19,5,'2026-02-04 15:37:06','2026-02-13 03:22:33'),(37,'Сет «Сам бы ел»','',1300.00,'/uploads/products/product_new_1770635428483.webp',19,1,'2026-02-04 15:37:19','2026-02-13 03:22:33'),(38,'Сет «Сытый папа»','',1150.00,'/uploads/products/product_new_1770635407484.webp',19,4,'2026-02-04 15:37:27','2026-02-13 03:22:33'),(39,'Сет «Темпура MINI»','',750.00,'/uploads/products/product_new_1770635538142.webp',19,3,'2026-02-04 15:37:35','2026-02-13 03:22:33'),(40,'Сет «Трезубец»','Запеченный чикен острый 8 шт, \nзапеченный с крабом 8 шт, \nзапеченный с лососем 8 шт.',1150.00,'/uploads/products/product_new_1770635670930.webp',19,2,'2026-02-04 15:37:44','2026-02-13 03:22:33'),(41,'Сет «Хочу в отпуск...»','',1300.00,'/uploads/products/product_new_1770635293583.webp',19,0,'2026-02-04 15:37:51','2026-02-13 03:22:33'),(42,'4 лосося','',1650.00,'/uploads/products/product_new_1770637428157.webp',20,103,'2026-02-04 15:38:07','2026-02-13 03:22:33'),(43,'Maxi сет','',1650.00,'/uploads/products/product_new_1770637413117.webp',20,102,'2026-02-04 15:38:28','2026-02-13 03:22:33'),(44,'С ЛЕГКИМ ПАРОМ','',1450.00,'/uploads/products/product_new_1770638886672.webp',20,101,'2026-02-04 15:38:36','2026-02-13 03:22:33'),(45,'Сет «1 кг Настроения»','',1200.00,'/uploads/products/product_new_1770638838856.webp',20,100,'2026-02-04 15:38:42','2026-02-13 03:22:33'),(46,'Сет «ТРИО» ','',1200.00,'/uploads/products/product_new_1770638773721.webp',20,99,'2026-02-04 15:38:50','2026-02-13 03:22:33'),(48,'Сет «Аляска»','',1650.00,'/uploads/products/product_new_1770637228603.webp',20,98,'2026-02-04 18:14:07','2026-02-13 03:22:33'),(49,'Сет «Гармония»','',1750.00,'/uploads/products/product_new_1770637219283.webp',20,97,'2026-02-04 18:18:23','2026-02-13 03:22:33'),(51,'Сет «Для Ксюхи»','',800.00,'/uploads/products/product_new_1770637187363.webp',20,96,'2026-02-04 18:18:50','2026-02-13 03:22:33'),(53,'Сет «Катана»','',1250.00,'',20,95,'2026-02-04 18:19:06','2026-02-13 03:22:33'),(54,'Сет «Мафия» Биг роллы','',1500.00,'/uploads/products/product_new_1770637157905.webp',20,94,'2026-02-04 18:19:13','2026-02-13 03:22:33'),(55,'Сет «Мини филадельфия»','',950.00,'/uploads/products/product_new_1770637147545.webp',20,93,'2026-02-04 18:19:22','2026-02-13 03:22:33'),(56,'Сет «Один дома»','',1300.00,'/uploads/products/product_new_1770637137515.webp',20,92,'2026-02-04 18:19:30','2026-02-13 03:22:33'),(59,'Сет «Темпура»','',1200.00,'/uploads/products/product_new_1770637080045.webp',20,91,'2026-02-04 18:20:13','2026-02-13 03:22:33'),(61,'Сет «Филадельфия микс»','',1850.00,'',20,90,'2026-02-04 18:20:27','2026-02-13 03:22:33'),(62,'Сет «Филадельфия»','',1700.00,'/uploads/products/product_new_1770636992272.webp',20,89,'2026-02-04 18:20:39','2026-02-13 03:22:33'),(63,'Сет «Фреш»','',1530.00,'/uploads/products/product_new_1770636980275.webp',20,88,'2026-02-04 18:20:46','2026-02-13 03:22:33'),(66,'Сет Долгожданный','',2700.00,'/uploads/products/product_new_1770636912017.webp',20,87,'2026-02-04 18:21:33','2026-02-13 03:22:33'),(67,'Сет ХО-ХО-ХО','',3000.00,'/uploads/products/product_new_1770636890671.webp',20,86,'2026-02-04 18:21:40','2026-02-13 03:22:33'),(68,'Мини ролл с болгарским перцем и сыром','140гр',110.00,'/uploads/products/product_new_1770643979674.webp',21,85,'2026-02-04 18:22:07','2026-02-13 03:22:33'),(69,'Мини ролл с копченой курицей и сыром','140гр',170.00,'/uploads/products/product_new_1770644026102.webp',21,84,'2026-02-04 18:22:30','2026-02-13 03:22:33'),(70,'Мини ролл с копченым угрем и сыром','140гр',180.00,'/uploads/products/product_new_1770644072295.webp',21,83,'2026-02-04 18:22:38','2026-02-13 03:22:33'),(71,'Мини ролл с креветкой и сыром','140гр',180.00,'/uploads/products/product_new_1770644109203.webp',21,82,'2026-02-04 18:22:45','2026-02-13 03:22:33'),(72,'Мини ролл с лососем и сыром','140гр',170.00,'/uploads/products/product_new_1770644146249.webp',21,81,'2026-02-04 18:22:51','2026-02-13 03:22:33'),(73,'Мини ролл с огурцом','140гр',110.00,'/uploads/products/product_new_1770644160073.webp',21,80,'2026-02-04 18:22:58','2026-02-13 03:22:33'),(74,'Мини ролл с огурцом и сыром','140гр',110.00,'/uploads/products/product_new_1770644331881.webp',21,79,'2026-02-04 18:23:04','2026-02-13 03:22:33'),(75,'Мини ролл с чукой','140гр',140.00,'/uploads/products/product_new_1770644344676.webp',21,78,'2026-02-04 18:23:11','2026-02-13 03:22:33'),(76,'Мини ролл со снежным крабом','140гр',140.00,'/uploads/products/product_new_1770644367937.webp',21,77,'2026-02-04 18:23:18','2026-02-13 03:22:33'),(78,'Авокадо с креветкой','',540.00,'/uploads/products/product_new_1770638716574.webp',22,76,'2026-02-04 18:25:38','2026-02-13 03:22:33'),(79,'Авокадо с лососем','',580.00,'/uploads/products/product_new_1770638706518.webp',22,75,'2026-02-04 18:25:58','2026-02-13 03:22:33'),(82,'Банзай в стружке тунца','',350.00,'/uploads/products/product_new_1770639624649.webp',22,74,'2026-02-04 18:26:19','2026-02-13 03:22:33'),(83,'Бутто','',330.00,'/uploads/products/product_new_1770638621800.webp',22,73,'2026-02-04 18:26:25','2026-02-13 03:22:33'),(84,'Калифорния с крабом','',400.00,'/uploads/products/product_new_1770639548344.webp',22,72,'2026-02-04 18:26:32','2026-02-13 03:22:33'),(85,'Калифорния с креветкой и лососем ','',500.00,'/uploads/products/product_new_1770639579176.webp',22,71,'2026-02-04 18:26:38','2026-02-13 03:22:33'),(86,'Калифорния с лососем','',420.00,'/uploads/products/product_new_1770639500320.webp',22,70,'2026-02-04 18:26:48','2026-02-13 03:22:33'),(87,'Канада с лососем','',470.00,'/uploads/products/product_new_1770638584411.webp',22,69,'2026-02-04 18:26:54','2026-02-13 03:22:33'),(88,'Лава с крабом','',300.00,'/uploads/products/product_new_1770638561617.webp',22,68,'2026-02-04 18:27:00','2026-02-13 03:22:33'),(89,'Невада в белом кунжуте','',350.00,'/uploads/products/product_new_1770638541798.webp',22,67,'2026-02-04 18:27:06','2026-02-13 03:22:33'),(90,'Нью — йорк','',600.00,'/uploads/products/product_new_1770638495926.webp',22,66,'2026-02-04 18:27:12','2026-02-13 03:22:33'),(93,'Унаги урамаки','',550.00,'/uploads/products/product_new_1770638426922.webp',22,65,'2026-02-04 18:27:32','2026-02-13 03:22:33'),(95,'Филадельфия лайт','',550.00,'/uploads/products/product_new_1770638410252.webp',22,64,'2026-02-04 18:27:57','2026-02-13 03:22:33'),(97,'Филадельфия люкс','',870.00,'/uploads/products/product_new_1770638392243.webp',22,63,'2026-02-04 18:28:11','2026-02-13 03:22:33'),(99,'Филадельфия плюс','',620.00,'/uploads/products/product_new_1770638359247.webp',22,62,'2026-02-04 18:28:28','2026-02-13 03:22:33'),(101,'Филадельфия с креветкой','',600.00,'/uploads/products/product_new_1770638311526.webp',22,61,'2026-02-04 18:29:23','2026-02-13 03:22:33'),(103,'Филадельфия Тери','',450.00,'/uploads/products/product_new_1770638282838.webp',22,60,'2026-02-04 18:29:35','2026-02-13 03:22:33'),(104,'Филадельфия унаги','',720.00,'/uploads/products/product_new_1770638259975.webp',22,59,'2026-02-04 18:29:41','2026-02-13 03:22:33'),(106,'Фирменный ролл с чукой','',190.00,'/uploads/products/product_new_1770638222899.webp',22,58,'2026-02-04 18:29:55','2026-02-13 03:22:33'),(109,'Чикен ролл','',250.00,'',22,57,'2026-02-04 18:30:14','2026-02-13 03:22:33'),(110,'Чука помидор','',260.00,'/uploads/products/product_new_1770638173282.webp',22,56,'2026-02-04 18:30:21','2026-02-13 03:22:33'),(112,'Запеченная филадельфия','',890.00,'',23,55,'2026-02-04 18:31:19','2026-02-13 03:22:33'),(113,'Запеченная филадельфия с креветкой','',920.00,'',23,54,'2026-02-04 18:31:33','2026-02-13 03:22:33'),(114,'Запеченные с крабом','',370.00,'',23,53,'2026-02-04 18:31:39','2026-02-13 03:22:33'),(115,'Запеченный ролл барбекю','',330.00,'',23,52,'2026-02-04 18:31:45','2026-02-13 03:22:33'),(116,'Запеченный ролл с беконом','',330.00,'',23,51,'2026-02-04 18:31:53','2026-02-13 03:22:33'),(117,'Запеченный с мидиями','',370.00,'',23,50,'2026-02-04 18:31:59','2026-02-13 03:22:33'),(119,'Запеченный с омлетом и сыром','',300.00,'',23,49,'2026-02-04 18:32:14','2026-02-13 03:22:33'),(120,'Запеченный с угрем','',430.00,'',23,48,'2026-02-04 18:32:20','2026-02-13 03:22:33'),(121,'Запеченые роллы с креветкой','',400.00,'',23,47,'2026-02-04 18:32:27','2026-02-13 03:22:33'),(122,'Запеченые роллы с лососем','',400.00,'',23,46,'2026-02-04 18:32:37','2026-02-13 03:22:33'),(123,'Запеченый чикен ролл','',350.00,'',23,45,'2026-02-04 18:32:44','2026-02-13 03:22:33'),(124,'Лосось гриль','',830.00,'',23,44,'2026-02-04 18:32:50','2026-02-13 03:22:33'),(125,'Жареный ролл «ФУТОМАКИ»','сыр курица томат лук перец острый ',380.00,'/uploads/products/product_new_1770636385708.webp',24,43,'2026-02-04 18:33:04','2026-02-13 03:22:33'),(126,'Жареный ролл с беконом','',380.00,'/uploads/products/product_new_1770643725845.webp',24,42,'2026-02-04 18:33:10','2026-02-13 03:22:33'),(127,'Жареный ролл с креветкой','сыр креветка огурец \n320гр',380.00,'/uploads/products/product_new_1770643634722.webp',24,41,'2026-02-04 18:33:17','2026-02-13 03:22:33'),(128,'Жареный ролл с лососем','сыр лосось огурец\n320гр',390.00,'/uploads/products/product_new_1770643594760.webp',24,40,'2026-02-04 18:33:22','2026-02-13 03:22:33'),(129,'Жареный ролл с угрем','сыр угорь огурец \n320гр',420.00,'/uploads/products/product_new_1770643540278.webp',24,39,'2026-02-04 18:33:29','2026-02-13 03:22:33'),(130,'Темпура краб','сыр краб огурец \n320гр',370.00,'/uploads/products/product_new_1770643501507.webp',24,38,'2026-02-04 18:33:34','2026-02-13 03:22:33'),(131,'Темпура Лайт','сыр чука лосось огурец \n320гр',390.00,'/uploads/products/product_new_1770643401263.webp',24,37,'2026-02-04 18:33:40','2026-02-13 03:22:33'),(132,'Унаги Хот','угорь сыр креветка авокадо\n320гр',420.00,'/uploads/products/product_new_1770643262319.webp',24,36,'2026-02-04 18:33:45','2026-02-13 03:22:33'),(133,'Чикен темпура','курица сыр огурец перец болгарский \n280гр',370.00,'/uploads/products/product_new_1770643061221.webp',24,35,'2026-02-04 18:33:51','2026-02-13 03:22:33'),(134,'Карбонара','',400.00,'/uploads/products/product_new_1770638094045.webp',25,34,'2026-02-04 18:34:06','2026-02-13 03:22:33'),(135,'Курица с грибами','',320.00,'',25,33,'2026-02-04 18:34:14','2026-02-13 03:22:33'),(136,'Удон с курицей','',380.00,'/uploads/products/product_new_1770638078404.webp',25,32,'2026-02-04 18:34:19','2026-02-13 03:22:33'),(147,'Пицца «4 сыра» ','',400.00,'/uploads/products/product_new_1770636873931.webp',26,30,'2026-02-05 20:23:53','2026-02-13 03:22:33'),(148,'Пицца «Американа» ','',380.00,'/uploads/products/product_new_1770636855845.webp',26,29,'2026-02-05 20:24:23','2026-02-13 03:22:33'),(149,'Пицца «Ветчина и грибы» ','',390.00,'/uploads/products/product_new_1770636847939.webp',26,28,'2026-02-05 20:24:46','2026-02-13 03:22:33'),(150,'Пицца «Виктория»','',360.00,'/uploads/products/product_new_1770636839457.webp',26,27,'2026-02-05 20:25:02','2026-02-13 03:22:33'),(151,'Пицца «Гавайская» ','',370.00,'/uploads/products/product_new_1770636831010.webp',26,26,'2026-02-05 20:25:17','2026-02-13 03:22:33'),(152,'Пицца «Деревенская» ','',380.00,'/uploads/products/product_new_1770636819642.webp',26,25,'2026-02-05 20:25:49','2026-02-13 03:22:33'),(153,'Пицца «Карбонара» ','',400.00,'/uploads/products/product_new_1770636809846.webp',26,24,'2026-02-05 20:26:04','2026-02-13 03:22:33'),(154,'Пицца «Крестный отец»','',430.00,'/uploads/products/product_new_1770636800215.webp',26,23,'2026-02-05 20:26:22','2026-02-13 03:22:33'),(155,'Пицца «Лагуна»','',450.00,'/uploads/products/product_new_1770636791769.webp',26,22,'2026-02-05 20:26:53','2026-02-13 03:22:33'),(156,'Пицца «Маргарита»','',350.00,'/uploads/products/product_new_1770636781539.webp',26,21,'2026-02-05 20:27:08','2026-02-13 03:22:33'),(157,'Пицца «Морская»','',460.00,'/uploads/products/product_new_1770636704841.webp',26,20,'2026-02-05 20:27:22','2026-02-13 03:22:33'),(158,'Пицца «Мясное барбекю»','',420.00,'/uploads/products/product_new_1770636697140.webp',26,19,'2026-02-05 20:27:37','2026-02-13 03:22:33'),(159,'Пицца «Пепперони»','',390.00,'/uploads/products/product_new_1770636685438.webp',26,18,'2026-02-05 20:27:50','2026-02-13 03:22:33'),(161,'Пицца «Семга»','',420.00,'/uploads/products/product_new_1770636635127.webp',26,16,'2026-02-05 20:28:12','2026-02-13 03:22:33'),(162,'Пицца «Сливочный бекон»','',400.00,'/uploads/products/product_new_1770636620372.webp',26,15,'2026-02-05 20:28:25','2026-02-13 03:22:33'),(163,'Пицца «Сырная курочка»','',390.00,'/uploads/products/product_new_1770636533966.webp',26,14,'2026-02-05 20:28:38','2026-02-13 03:22:33'),(164,'Пицца «Флоренция»','',380.00,'/uploads/products/product_new_1770636510083.webp',26,13,'2026-02-05 20:28:52','2026-02-13 03:22:33'),(165,'Пицца «Цезарь»','',400.00,'/uploads/products/product_new_1770636595482.webp',26,12,'2026-02-05 20:29:08','2026-02-13 03:22:33'),(167,'Бургер «Фирменный»','',400.00,'/uploads/products/product_new_1770635786345.webp',27,10,'2026-02-05 20:43:13','2026-02-13 03:22:33'),(168,'Бургер «Чикен»','',350.00,'/uploads/products/product_new_1770635718571.webp',27,9,'2026-02-05 20:43:24','2026-02-13 03:22:33'),(170,'Картофель фри','',185.00,'/uploads/products/product_new_1770637889955.webp',28,7,'2026-02-05 20:43:56','2026-02-13 03:22:33'),(171,'Корн-дог (3 шт.)','',220.00,'/uploads/products/product_new_1770637864251.webp',28,6,'2026-02-05 20:44:06','2026-02-13 03:22:33'),(172,'Креветки темпура (6 шт.)','',430.00,'/uploads/products/product_new_1770637797723.webp',28,5,'2026-02-05 20:44:18','2026-02-13 03:22:33'),(174,'Наггетсы','',250.00,'/uploads/products/product_new_1770637547479.webp',28,3,'2026-02-05 20:44:56','2026-02-13 03:22:33'),(175,'Сет мидий (9 шт)','',990.00,'/uploads/products/product_new_1770637531574.webp',28,2,'2026-02-05 20:45:03','2026-02-13 03:22:33'),(176,'Мидии киви 5 шт.','',600.00,'/uploads/products/product_new_1770637701690.webp',28,1,'2026-02-05 20:45:11','2026-02-13 03:22:34'),(177,'Японский сендвич с курицей','',325.00,'/uploads/products/product_new_1770637503532.webp',28,0,'2026-02-05 20:45:21','2026-02-13 03:22:34');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `size_addons`
--

DROP TABLE IF EXISTS `size_addons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `size_addons` (
  `id` int NOT NULL AUTO_INCREMENT,
  `size_id` int NOT NULL,
  `addon_id` int NOT NULL,
  `is_required` int DEFAULT '0',
  `price_modifier` decimal(10,2) DEFAULT '0.00',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_size` (`size_id`),
  KEY `idx_addon` (`addon_id`),
  CONSTRAINT `size_addons_ibfk_1` FOREIGN KEY (`size_id`) REFERENCES `sizes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `size_addons_ibfk_2` FOREIGN KEY (`addon_id`) REFERENCES `addons` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `size_addons`
--

LOCK TABLES `size_addons` WRITE;
/*!40000 ALTER TABLE `size_addons` DISABLE KEYS */;
/*!40000 ALTER TABLE `size_addons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sizes`
--

DROP TABLE IF EXISTS `sizes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sizes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price_modifier` decimal(10,2) DEFAULT '0.00',
  `sort_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_product` (`product_id`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `sizes_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sizes`
--

LOCK TABLES `sizes` WRITE;
/*!40000 ALTER TABLE `sizes` DISABLE KEYS */;
/*!40000 ALTER TABLE `sizes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `customer_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_customer` (`customer_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@yabudu.com','$2b$10$Ya4EA2ODvlYiOLxZtnUWfOrdOAV8.ZPC40SFPuhVZLoiCu/GHZe1m','admin',1,'2026-01-30 17:41:32'),(2,'dezin.ru@mail.ru','$2b$10$oRN1TVf8DPejRELWzfc96O.9KAbE7s7BTTEKQhA4jXfS5HigavkoO','user',3,'2026-01-30 19:14:32'),(4,'onikesao@mail.ru','$2b$10$VkYXyIz5YBNS9kEmtLZj6eFGsCNWdyq/7n3IrcBj5qZ4DVDojqqyS','user',5,'2026-02-09 07:15:53'),(5,'irkamn76@gmail.com','$2b$10$DnwJlZuVR7rTWT4cRRvkouNbjZ91BRiEj1CRyegBzENpD8MWEohee','user',6,'2026-02-09 13:49:48');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-20 13:24:00
