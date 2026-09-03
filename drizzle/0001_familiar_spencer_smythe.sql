CREATE TABLE `finance_cloud` (
	`userId` int NOT NULL,
	`payload` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `finance_cloud_userId` PRIMARY KEY(`userId`)
);
