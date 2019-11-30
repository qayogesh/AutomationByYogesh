package com.yogesh.automation.ObjectiveProgramming;

import java.util.ArrayList;
import java.util.Collections;

public class TC05SearchValueInArray {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		TC05SearchValueInArray obj = new TC05SearchValueInArray();
		Integer[] arr = { 56, 4, 2, 66, 3, 5 };
		obj.containsSearch(arr);
	}

	public void containsSearch(Integer[] arr) {
		ArrayList<Integer> list = new ArrayList<>();
		Collections.addAll(list, arr);
		System.out.println("contains using list.contains    " + list.contains(5));

		// using collections
		System.out.println("using collections binary search " + Collections.binarySearch(list, 5));

		// using stream
		System.out.println("using stream search element      " + list.stream().findAny().of(5).isPresent());
	}

}
