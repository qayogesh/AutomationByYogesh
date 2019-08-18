package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class TC05_SumMaxMinAverage_ArrayList {

	public static void main(String[] args) {

		/**
		 * Problem Given I have array list I want number of items in the cart I want to
		 * get total price of items in the cart I want max price of items list I want
		 * min price of items lists I want to know the difference between max and min
		 */

		// solutions
		// 1. get the array list
		// 2. User Collectors

		List<Product> list = new ArrayList<Product>();
		list.add(new Product(11, "book", 109));
		list.add(new Product(22, "shelf", 1009));
		list.add(new Product(33, "tennis rackette", 1900));
		list.add(new Product(44, "crricket bat", 199));
		list.add(new Product(55, "toys", 123));
		list.add(new Product(66, "towels", 49));
		list.add(new Product(77, "hangers", 12));

		Double sumIs = list.stream().collect(Collectors.summingDouble(x -> x.price));
		Double avgIs = list.stream().collect(Collectors.averagingDouble(x -> x.price));
		long totalItems = list.stream().count();

		System.out.println("\nMAX " + sumIs);
		System.out.println("\nAVG " + avgIs);
		System.out.println("\nTOTAL " + totalItems);
	}

}
