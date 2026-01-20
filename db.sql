-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         9.3.0 - MySQL Community Server - GPL
-- SO del servidor:              Win64
-- HeidiSQL Versión:             12.8.0.6908
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para gestion_microempresas
CREATE DATABASE IF NOT EXISTS `gestion_microempresas` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `gestion_microempresas`;

-- Volcando estructura para tabla gestion_microempresas.cliente
CREATE TABLE IF NOT EXISTS `cliente` (
  `id_cliente` int NOT NULL AUTO_INCREMENT,
  `nombre_razon_social` varchar(150) NOT NULL,
  `ci_nit` varchar(20) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `microempresa_id` int DEFAULT NULL,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `password` varchar(255) DEFAULT NULL,
  `origen` enum('publico','sistema') DEFAULT 'publico',
  `usuario_registro` int DEFAULT NULL,
  PRIMARY KEY (`id_cliente`),
  KEY `microempresa_id` (`microempresa_id`),
  CONSTRAINT `cliente_ibfk_1` FOREIGN KEY (`microempresa_id`) REFERENCES `microempresa` (`id_microempresa`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.compra
CREATE TABLE IF NOT EXISTS `compra` (
  `id_compra` int NOT NULL AUTO_INCREMENT,
  `id_microempresa` int DEFAULT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL,
  `estado` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_compra`),
  KEY `id_microempresa` (`id_microempresa`),
  CONSTRAINT `compra_ibfk_1` FOREIGN KEY (`id_microempresa`) REFERENCES `microempresa` (`id_microempresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.detalle_compra
CREATE TABLE IF NOT EXISTS `detalle_compra` (
  `id_detalle_compra` int NOT NULL AUTO_INCREMENT,
  `id_compra` int DEFAULT NULL,
  `id_producto` int DEFAULT NULL,
  `id_proveedor` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_detalle_compra`),
  KEY `id_compra` (`id_compra`),
  KEY `id_producto` (`id_producto`),
  KEY `id_proveedor` (`id_proveedor`),
  CONSTRAINT `detalle_compra_ibfk_1` FOREIGN KEY (`id_compra`) REFERENCES `compra` (`id_compra`),
  CONSTRAINT `detalle_compra_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `producto` (`id_producto`),
  CONSTRAINT `detalle_compra_ibfk_3` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedor` (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.detalle_pedido
CREATE TABLE IF NOT EXISTS `detalle_pedido` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `pedido_id` int DEFAULT NULL,
  `producto_id` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `pedido_id` (`pedido_id`),
  KEY `producto_id` (`producto_id`),
  CONSTRAINT `detalle_pedido_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedido` (`id_pedido`),
  CONSTRAINT `detalle_pedido_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id_producto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.inventario_movimiento
CREATE TABLE IF NOT EXISTS `inventario_movimiento` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `tipo` enum('entrada','salida','ajuste') NOT NULL,
  `cantidad` int NOT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `producto_id` int DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `microempresa_id` int DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `producto_id` (`producto_id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `microempresa_id` (`microempresa_id`),
  CONSTRAINT `inventario_movimiento_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `producto` (`id_producto`),
  CONSTRAINT `inventario_movimiento_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `inventario_movimiento_ibfk_3` FOREIGN KEY (`microempresa_id`) REFERENCES `microempresa` (`id_microempresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.microempresa
CREATE TABLE IF NOT EXISTS `microempresa` (
  `id_microempresa` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `nit` varchar(20) DEFAULT NULL,
  `direccion` text,
  `telefono` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `moneda` varchar(10) DEFAULT 'BOB',
  `estado` enum('activa','inactiva') DEFAULT 'activa',
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `plan_id` int DEFAULT NULL,
  `estado_suscripcion` enum('pendiente','activa','rechazada','suspendida') DEFAULT 'pendiente',
  `fecha_solicitud` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_aprobacion` timestamp NULL DEFAULT NULL,
  `aprobado_por` int DEFAULT NULL,
  `razon_rechazo` text,
  `rubro` varchar(100) DEFAULT NULL,
  `descripcion` text,
  PRIMARY KEY (`id_microempresa`),
  UNIQUE KEY `nit` (`nit`),
  KEY `plan_id` (`plan_id`),
  KEY `aprobado_por` (`aprobado_por`),
  CONSTRAINT `microempresa_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plan_pago` (`id_plan`),
  CONSTRAINT `microempresa_ibfk_2` FOREIGN KEY (`aprobado_por`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.pedido
CREATE TABLE IF NOT EXISTS `pedido` (
  `id_pedido` int NOT NULL AUTO_INCREMENT,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `total` decimal(10,2) NOT NULL,
  `metodo_pago` varchar(50) DEFAULT NULL,
  `estado` varchar(50) DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `cliente_id` int DEFAULT NULL,
  PRIMARY KEY (`id_pedido`),
  KEY `usuario_id` (`usuario_id`),
  KEY `cliente_id` (`cliente_id`),
  CONSTRAINT `pedido_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `pedido_ibfk_2` FOREIGN KEY (`cliente_id`) REFERENCES `cliente` (`id_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.plan_pago
CREATE TABLE IF NOT EXISTS `plan_pago` (
  `id_plan` int NOT NULL AUTO_INCREMENT,
  `nombre_plan` varchar(50) NOT NULL,
  `tipo_plan` varchar(50) DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  `limite_usuarios` int DEFAULT NULL,
  `limite_productos` int DEFAULT NULL,
  `estado` enum('suscrito','no suscrito') DEFAULT 'suscrito',
  `descripcion` text,
  `caracteristicas` json DEFAULT NULL,
  `periodo` varchar(20) DEFAULT 'mensual',
  `popular` tinyint(1) DEFAULT '0',
  `fecha_creacion` date DEFAULT NULL,
  PRIMARY KEY (`id_plan`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.producto
CREATE TABLE IF NOT EXISTS `producto` (
  `id_producto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `precio` decimal(10,2) NOT NULL,
  `stock_actual` int DEFAULT '0',
  `stock_minimo` int DEFAULT '0',
  `estado` enum('discontinuado','stock') DEFAULT 'stock',
  `categoria` varchar(50) DEFAULT NULL,
  `microempresa_id` int DEFAULT NULL,
  PRIMARY KEY (`id_producto`),
  KEY `microempresa_id` (`microempresa_id`),
  CONSTRAINT `producto_ibfk_1` FOREIGN KEY (`microempresa_id`) REFERENCES `microempresa` (`id_microempresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.proveedor
CREATE TABLE IF NOT EXISTS `proveedor` (
  `id_proveedor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` text,
  `telefono` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id_proveedor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.rol
CREATE TABLE IF NOT EXISTS `rol` (
  `id_rol` int NOT NULL AUTO_INCREMENT,
  `tipo_rol` enum('super_admin','administrador','microempresa_P','vendedor') NOT NULL,
  PRIMARY KEY (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.usuario
CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('activo','inactivo') DEFAULT 'activo',
  `microempresa_id` int DEFAULT NULL,
  `rol_id` int DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expire` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `email` (`email`),
  KEY `microempresa_id` (`microempresa_id`),
  KEY `rol_id` (`rol_id`),
  CONSTRAINT `usuario_ibfk_1` FOREIGN KEY (`microempresa_id`) REFERENCES `microempresa` (`id_microempresa`),
  CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

-- Volcando estructura para tabla gestion_microempresas.visita_microempresa
CREATE TABLE IF NOT EXISTS `visita_microempresa` (
  `id_visita` int NOT NULL AUTO_INCREMENT,
  `cliente_id` int DEFAULT NULL,
  `microempresa_id` int DEFAULT NULL,
  `fecha_visita` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo_visita` enum('exploracion','registro') DEFAULT 'exploracion',
  PRIMARY KEY (`id_visita`),
  KEY `cliente_id` (`cliente_id`),
  KEY `microempresa_id` (`microempresa_id`),
  CONSTRAINT `visita_microempresa_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `cliente` (`id_cliente`),
  CONSTRAINT `visita_microempresa_ibfk_2` FOREIGN KEY (`microempresa_id`) REFERENCES `microempresa` (`id_microempresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- La exportación de datos fue deseleccionada.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
