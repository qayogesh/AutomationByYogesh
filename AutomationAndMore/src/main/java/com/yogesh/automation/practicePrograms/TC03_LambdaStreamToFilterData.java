package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

public class TC03_LambdaStreamToFilterData {

	public static void main(String[] args) {
		List<Product> list = new ArrayList<Product>();
		list.add(new Product(2, "sagar", 20));
		list.add(new Product(1, "harshada", 10));
		list.add(new Product(3, "vivasvan", 30));
		list.add(new Product(4, "shobha", 10));
		list.add(new Product(5, "bharat", 20));
		list.add(new Product(5, "mom", 30));
		list.add(new Product(7, "dad", 30));
		list.add(new Product(6, "can you see me", 20));

		System.out.println(" * Display all * ");
		list.stream().filter(tc -> tc.price > 5).forEach(tc -> System.out.println(tc.price));
		System.out.print("");

		System.out.println(" * filter price List * ");
		List<Float> priceList = list.stream().filter(tc -> tc.price > 10).map(tc -> tc.price)
				.collect(Collectors.toList());
		System.out.println(priceList);

		System.out.println(" * filter price SET * ");
		Set<Float> priceSet = list.stream().filter(tc -> tc.price > 11).map(tc -> tc.price).collect(Collectors.toSet());
		System.out.println(priceSet);

		System.out.println(" * filter id list * ");
		Set<Integer> id = list.stream().filter(tc -> tc.id > 1).map(tc -> tc.id).collect(Collectors.toSet());
		System.out.println(id);

		System.out.println(" * filter even numbers * ");
		List<Integer> evenIds = list.stream().filter(tc -> tc.id != 5).map(tc -> tc.id).collect(Collectors.toList());
		System.out.println(evenIds);

		// Sum of product prices
		Double sumOfPrices = list.stream().collect(Collectors.summingDouble(tc -> tc.price));
		System.out.println("Sum of prices using collecot " + sumOfPrices);

		/**
		 * Get the sum of ArrayList
		 */
		List<Integer> intList = new ArrayList<Integer>();
		intList.add(5);
		intList.add(9);
		intList.add(9);
		intList.add(6);
		intList.add(3);
		intList.add(1);

		Function<List<Integer>, Integer> fun = Product::getMeSum;
		System.out.println(fun.apply(intList));

	}

}
