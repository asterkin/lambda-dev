// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var util = require('util');

// get reference to S3 client 
var s3 = new AWS.S3();
var cloudformation = new AWS.CloudFormation();
 
exports.handler = function(event, context, callback) {
    // Read options from the environment
    var testDataBucket = process.env.TEST_DATA;  
    console.log("Setting Test Data Bucket to:\n", testDataBucket);

    async.waterfall([
        function get_upload_bucket(next) {
	    cloudformation.describeStackResource({
	    		LogicalResourceId: 'FacePicture', /* required */
	        	StackName:         'CreateThumbnail' /* required */
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
            console.log("Posting images: \n", testData);
            var uploadBucketId = uploadBucket.StackResourceDetail.PhysicalResourceId
            console.log("To:\n", uploadBucketId);
            async.map(
		testData.Contents, 
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
            } else {
                console.log('Success!');
            }

            callback(null, "message");
        }
    );
};

