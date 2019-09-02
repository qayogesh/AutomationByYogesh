package com.api.restAssured.Utils;

import com.jayway.restassured.RestAssured;
import com.jayway.restassured.builder.RequestSpecBuilder;
import com.jayway.restassured.http.ContentType;
import com.jayway.restassured.specification.RequestSpecification;

public class RestUtils {

	public static void setBaseUrl(String baseUri) {
		RestAssured.baseURI = baseUri;
	}

	public static void setBasePath(String basePath) {
		RestAssured.basePath = basePath;
	}

	public static void reSetBaseUrl() {
		RestAssured.baseURI = null;
	}

	public static void reSetBasePath() {
		RestAssured.basePath = null;
	}

	public static void requestSpecBuilder() {
		RequestSpecBuilder builder = new RequestSpecBuilder();

	}

	public static RequestSpecification requestSpecification(String HOST) {
		RestAssured.baseURI = HOST;
		RequestSpecification requestSpec = RestAssured.given().contentType(ContentType.JSON).authentication()
				.basic("", "");
		return requestSpec;
	}

}
