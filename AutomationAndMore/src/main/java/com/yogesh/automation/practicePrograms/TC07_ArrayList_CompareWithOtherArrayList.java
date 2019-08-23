package com.yogesh.automation.practicePrograms;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.stream.Collectors;

public class TC07_ArrayList_CompareWithOtherArrayList {

	public static void main(String[] args) {

		ArrayList<Integer> arrayList1 = new ArrayList<>();
		arrayList1.add(1);
		arrayList1.add(3);
		arrayList1.add(5);
		arrayList1.add(7);
		arrayList1.add(7);
		arrayList1.add(9);
		arrayList1.add(10);
		System.out.println(arrayList1);

		ArrayList<Integer> arrayList2 = new ArrayList<>();
		arrayList2.add(5);
		arrayList2.add(7);
		arrayList2.add(8);
		arrayList2.add(9);
		arrayList2.add(10);
		arrayList2.add(10);
		System.out.println(arrayList2);

		/**
		 * Compare two array lists
		 */
		System.out.println(arrayList1.retainAll(arrayList2));
		if (arrayList1.retainAll(arrayList2) == false) {
			System.out.println("Both array lists are not matching");
		} else {
			System.out.println("Both array lists are exact matching");
		}

		/**
		 * Max
		 */
		System.out.println(arrayList1);
		System.out.println(arrayList2);
		System.out.println("arrayList1 Max " + Collections.max(arrayList1));
		System.out.println("arrayList2 Max " + Collections.max(arrayList2));

		/**
		 * Min
		 */
		System.out.println("arrayList1 min " + Collections.min(arrayList1));
		System.out.println("arrayList2 min " + Collections.min(arrayList2));

		/**
		 * duplicates flag
		 */
		System.out.println("arrayList1 distinct " + arrayList1.stream().distinct().collect(Collectors.toSet()));
		System.out.println("arrayList2 distinct " + arrayList2.stream().distinct().collect(Collectors.toSet()));

		System.out.println("arrayList1 duplicate "
				+ arrayList1.retainAll(arrayList1.stream().distinct().collect(Collectors.toSet())));
		System.out.println("arrayList1 duplicate "
				+ arrayList2.retainAll(arrayList2.stream().distinct().collect(Collectors.toSet())));

		/**
		 * Ascending order
		 */
		Collections.sort(arrayList1);
		System.out.println("Ascending order arrayList1 " + arrayList1);

		/**
		 * Descending order
		 */
		Collections.reverse(arrayList2);
		System.out.println("Descending order arrayList2 " + arrayList2);

	}
}
