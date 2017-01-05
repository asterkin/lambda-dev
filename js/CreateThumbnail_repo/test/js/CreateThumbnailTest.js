// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');

// get reference to S3 client 
var s3             = new AWS.S3();
var cloudformation = new AWS.CloudFormation();
var codepipeline   = new AWS.CodePipeline();
 
exports.handler = function(event, context, callback) {
    console.log("Received parameters:\n", event);
    var jobId = event.jobId;
    // Read options from the environment
    var testDataBucket = process.env.TEST_DATA;
    var stackName      = process.env.STACK_NAME  
    console.log("Setting Test Data Bucket to:\n", testDataBucket);

    async.waterfall([
        function get_upload_bucket(next) {
	    cloudformation.describeStackResource({
	    		LogicalResourceId: 'FacePicture', /* required */
	        	StackName:         stackName /* required */
	    	},
		next);
            },
        function list_test_files(uploadBucket, next) {
            s3.listObjects({
                	Bucket: testDataBucket
                },
                function(err, data) {
		  if(err) {
                    next(err);
                  } else {
                    next(null, data, uploadBucket);
                  }
                });
            },
        function copy(testData, uploadBucket, next) {
            var images = testData.Contents.filter(function(item) { return item.Key.endsWith(".png"); })
            console.log("Posting images: \n", images);
            var uploadBucketId = uploadBucket.StackResourceDetail.PhysicalResourceId
            console.log("To:\n", uploadBucketId);
            async.map(
		images, 
		function(item, callback){
			s3.copyObject({
				Bucket:     uploadBucketId,
				CopySource: testData.Name + "/"  + item.Key,
				Key:        item.Key
			}, 
			function(copyErr, copyData){
        			if (copyErr) {
          				console.log(copyErr);
          				callback(copyErr);
        			} else {
          				console.log('Copied: ', copyData);
          				callback(null, copyData);
				}
        		})
		}, next);
            }
        ], function (err) {
            if (err) {
                console.error(err);
                var params = {
                  failureDetails: { /* required */
                    message: err, /* required */
                    type: 'JobFailed' /* required */
                  },
                  jobId: jobId /* required */
                };
                codepipeline.putJobFailureResult(params, function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else     console.log(data);           // successful response
                });
            } else {
                console.log('Success!');
                var params = {
                  jobId: jobId /* required */
                };
                codepipeline.putJobSuccessResult(params, function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else     console.log(data);           // successful response
                });           
            }
            callback(null, "message");
        }
    );
};

