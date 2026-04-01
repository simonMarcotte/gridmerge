output "cloudfront_url" {
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
  description = "Public URL for the app"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.app.repository_url
  description = "ECR repository URL for Docker images"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "Frontend S3 bucket name"
}

output "s3_storage_bucket" {
  value       = aws_s3_bucket.storage.id
  description = "Job storage S3 bucket name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.main.id
  description = "CloudFront distribution ID (for cache invalidation)"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name"
}

output "ecs_api_service" {
  value       = aws_ecs_service.api.name
  description = "ECS API service name"
}

output "ecs_worker_service" {
  value       = aws_ecs_service.worker.name
  description = "ECS worker service name"
}

output "redis_endpoint" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "ElastiCache Redis endpoint"
}
