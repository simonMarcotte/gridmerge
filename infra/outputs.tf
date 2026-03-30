output "cloudfront_url" {
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
  description = "Public URL for the app"
}

output "ec2_instance_id" {
  value       = aws_instance.app.id
  description = "EC2 instance ID (for SSM and GitHub Actions)"
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.frontend.id
  description = "Frontend S3 bucket name"
}

output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.main.id
  description = "CloudFront distribution ID (for cache invalidation)"
}
