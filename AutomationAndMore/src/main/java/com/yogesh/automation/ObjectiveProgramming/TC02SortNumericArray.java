package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.stream.Collectors;

public class TC02SortNumericArray {

	public static void main(String[] args) {
		Integer[] array = { 84, 987635, 985, 55, 55, 98935 };

		TC02SortNumericArray obj = new TC02SortNumericArray();
		obj.sortedNumericArray(array);
	}

	// *Note - Array type is Integer and not int.
	public void sortedNumericArray(Integer[] arr) {
		System.out.println("Original array                   " + Arrays.toString(arr));
		Arrays.sort(arr);
		System.out.println("Sorted array using Arrays.sort   " + Arrays.toString(arr));

		ArrayList<Integer> al = new ArrayList<>();

		// using collections
		Collections.addAll(al, arr);
		Collections.sort(al);
		System.out.println("Sorted array using collections   " + Arrays.toString(arr));

		// using stream
		al.stream().sorted().forEach(System.out::println);

		// max/min number
		System.out.println("max " + Collections.max(al));
		System.out.println("min " + Collections.min(al));
		System.out.println("binary search " + al.get(Collections.binarySearch(al, 84)));
		int a = Collections.binarySearch(al, 84);

	}

}
