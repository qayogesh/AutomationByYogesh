package com.api.restAssured.apiTests;

import java.util.ArrayList;

import org.testng.Assert;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import com.api.restAssured.Utils.RestUtils;
import com.jayway.restassured.RestAssured;
import com.jayway.restassured.http.ContentType;
import com.jayway.restassured.path.json.JsonPath;
import com.jayway.restassured.response.ValidatableResponse;
import com.jayway.restassured.specification.RequestSpecification;

public class StarWarsGetStarships extends RestUtils {

	private static final String HOST = "https://swapi.co/api/";
	private static final String basePath = "starships/9/";

	@Test
	public void apiGetStarshipsListing() {
		ValidatableResponse validatableResponse = requestSpecification(HOST).when().get(basePath).then();
		validatableResponse.statusCode(200);
		String jsonResponse = validatableResponse.extract().body().asString();

		JsonPath jsonPath = new JsonPath(jsonResponse);
		System.out.println("json response is \n " + jsonResponse);

		// validations
		Assert.assertEquals(jsonPath.getString("name"), "Death Star");
		Assert.assertEquals(jsonPath.getString("model"), "DS-1 Orbital Battle Station");
		Assert.assertEquals(jsonPath.getString("manufacturer"),
				"Imperial Department of Military Research, Sienar Fleet Systems");
		Assert.assertEquals(jsonPath.getString("cost_in_credits"), "1000000000000");
		Assert.assertEquals(jsonPath.getString("length"), "120000");
		Assert.assertEquals(jsonPath.getString("max_atmosphering_speed"), "n/a");
		Assert.assertEquals(jsonPath.getString("crew"), "342953");
		Assert.assertEquals(jsonPath.getString("passengers"), "843342");
		Assert.assertEquals(jsonPath.getString("cargo_capacity"), "1000000000000");
		Assert.assertEquals(jsonPath.getString("consumables"), "3 years");
		Assert.assertEquals(jsonPath.getString("hyperdrive_rating"), "4.0");
		Assert.assertEquals(jsonPath.getString("MGLT"), "10");
		Assert.assertEquals(jsonPath.getString("starship_class"), "Deep Space Mobile Battlestation");
		Assert.assertEquals(jsonPath.getString("url"), "https://swapi.co/api/starships/9/");

		// Asserting ArrayList (json map)
		/**
		 * {"name":"Death Star","model":"DS-1 Orbital Battle
		 * Station","manufacturer":"Imperial Department of Military Research, Sienar
		 * Fleet
		 * Systems","cost_in_credits":"1000000000000","length":"120000","max_atmosphering_speed":"n/a","crew":"342953","passengers":"843342","cargo_capacity":"1000000000000","consumables":"3
		 * years","hyperdrive_rating":"4.0","MGLT":"10","starship_class":"Deep Space
		 * Mobile
		 * Battlestation","pilots":[],"films":["https://swapi.co/api/films/1/"],"created":"2014-12-10T16:36:50.509000Z","edited":"2014-12-22T17:35:44.452589Z","url":"https://swapi.co/api/starships/9/"}
		 **/

		ArrayList validatePilots = jsonPath.get("pilots");
		System.out.println("validatePilots.size() " + validatePilots.size());
		if (validatePilots.size() > 0) {
			for (int i = 0; i < validatePilots.size(); i++) {
				System.out.println("validatePilots : " + validatePilots.get(i));
			}
		}

		ArrayList validateFilms = jsonPath.get("films");
		if (validateFilms.size() > 0) {
			for (int i = 0; i < validateFilms.size(); i++) {
				System.out.println("validateFilms : " + validateFilms.get(i));
				Assert.assertEquals(validateFilms.get(i), "https://swapi.co/api/films/1/");
			}

		}

	}

}
